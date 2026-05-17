import { Router } from "express";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  db,
  coursesTable,
  courseModulesTable,
  coursePurchasesTable,
  courseAccessTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/requireAuth";
import { notify } from "../lib/notify";
import { ObjectStorageService } from "../lib/objectStorage";
import { randomUUID } from "crypto";
import multer from "multer";

const router = Router();
const objectStorageService = new ObjectStorageService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let i = 2;
  while (true) {
    const existing = await db.query.coursesTable.findFirst({
      where: eq(coursesTable.slug, slug),
    });
    if (!existing || existing.id === excludeId) break;
    slug = `${base}-${i++}`;
  }
  return slug;
}

async function getModules(courseId: string) {
  return db.query.courseModulesTable.findMany({
    where: eq(courseModulesTable.courseId, courseId),
    orderBy: asc(courseModulesTable.orderIndex),
  });
}

async function enrichCourse(
  course: typeof coursesTable.$inferSelect,
  userId?: string,
) {
  const [modules, creator] = await Promise.all([
    getModules(course.id),
    db.query.usersTable.findFirst({ where: eq(usersTable.id, course.createdBy) }),
  ]);

  let purchase: typeof coursePurchasesTable.$inferSelect | null = null;
  let hasAccess = false;

  if (userId) {
    const [p, a] = await Promise.all([
      db.query.coursePurchasesTable.findFirst({
        where: and(
          eq(coursePurchasesTable.courseId, course.id),
          eq(coursePurchasesTable.userId, userId),
        ),
      }),
      db.query.courseAccessTable.findFirst({
        where: and(
          eq(courseAccessTable.courseId, course.id),
          eq(courseAccessTable.userId, userId),
        ),
      }),
    ]);
    purchase = p ?? null;
    hasAccess = !!a;
  }

  return {
    ...course,
    pricePen: course.pricePen,
    modules: hasAccess ? modules : modules.map((m) => ({ ...m, videoUrl: null })),
    hasAccess,
    purchase: purchase
      ? {
          id: purchase.id,
          status: purchase.status,
          adminNotes: purchase.adminNotes,
          yapeOperationCode: purchase.yapeOperationCode,
          createdAt: purchase.createdAt,
        }
      : null,
    creatorName: creator?.displayName ?? "Unknown",
    moduleCount: modules.length,
  };
}

// ── GET /courses ──────────────────────────────────────────────────────────────

router.get("/courses", requireAuth, async (req, res) => {
  const courses = await db.query.coursesTable.findMany({
    where: eq(coursesTable.status, "published"),
    orderBy: desc(coursesTable.createdAt),
  });
  const enriched = await Promise.all(
    courses.map((c) => enrichCourse(c, req.userDbId)),
  );
  res.json(enriched);
});

// ── GET /courses/:slug ────────────────────────────────────────────────────────

router.get("/courses/:slug", requireAuth, async (req, res) => {
  const slug = req.params.slug as string;
  const course = await db.query.coursesTable.findFirst({
    where: eq(coursesTable.slug, slug),
  });
  if (!course) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (course.status === "draft") {
    const viewer = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, req.userId!),
      columns: { role: true },
    });
    if (viewer?.role !== "administrator") {
      res.status(404).json({ error: "Not found" });
      return;
    }
  }
  res.json(await enrichCourse(course, req.userDbId));
});

// ── POST /courses/:slug/purchase ──────────────────────────────────────────────

router.post("/courses/:slug/purchase", requireAuth, async (req, res) => {
  const slug = req.params.slug as string;
  const { yapeOperationCode } = req.body as { yapeOperationCode: string };
  const userId = req.userDbId!;

  if (!yapeOperationCode?.trim()) {
    res.status(400).json({ error: "Código de operación requerido" });
    return;
  }

  const course = await db.query.coursesTable.findFirst({
    where: and(
      eq(coursesTable.slug, slug),
      eq(coursesTable.status, "published"),
    ),
  });
  if (!course) {
    res.status(404).json({ error: "Curso no encontrado" });
    return;
  }

  // If already has access, no need to purchase
  const existing = await db.query.courseAccessTable.findFirst({
    where: and(
      eq(courseAccessTable.courseId, course.id),
      eq(courseAccessTable.userId, userId),
    ),
  });
  if (existing) {
    res.status(409).json({ error: "Ya tienes acceso a este curso" });
    return;
  }

  // Upsert purchase — if rejected, allow resubmit
  const existingPurchase = await db.query.coursePurchasesTable.findFirst({
    where: and(
      eq(coursePurchasesTable.courseId, course.id),
      eq(coursePurchasesTable.userId, userId),
    ),
  });

  let purchase: typeof coursePurchasesTable.$inferSelect;

  if (existingPurchase) {
    if (existingPurchase.status === "pending") {
      res.status(409).json({ error: "Ya tienes una solicitud pendiente" });
      return;
    }
    const [updated] = await db
      .update(coursePurchasesTable)
      .set({
        yapeOperationCode: yapeOperationCode.trim(),
        status: "pending",
        adminNotes: null,
        updatedAt: new Date(),
      })
      .where(eq(coursePurchasesTable.id, existingPurchase.id))
      .returning();
    purchase = updated;
  } else {
    const [inserted] = await db
      .insert(coursePurchasesTable)
      .values({
        id: randomUUID(),
        courseId: course.id,
        userId,
        yapeOperationCode: yapeOperationCode.trim(),
        status: "pending",
      })
      .returning();
    purchase = inserted;
  }

  // Notify all admins
  const buyer = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  const admins = await db.query.usersTable.findMany({
    where: eq(usersTable.role, "administrator"),
    columns: { id: true },
  });
  await Promise.all(
    admins.map((a) =>
      notify({
        recipientId: a.id,
        type: "course_purchase",
        title: "Nueva solicitud de compra",
        body: `${buyer?.displayName ?? "Alguien"} quiere comprar "${course.title}". Código Yape: ${yapeOperationCode.trim()}`,
        link: "/admin?tab=cursos",
      }).catch(() => {}),
    ),
  );

  res.status(201).json(purchase);
});

// ── ADMIN — GET /admin/courses ────────────────────────────────────────────────

router.get("/admin/courses", requireAdmin, async (_req, res) => {
  const courses = await db.query.coursesTable.findMany({
    orderBy: desc(coursesTable.createdAt),
  });
  const enriched = await Promise.all(courses.map((c) => enrichCourse(c)));
  res.json(enriched);
});

// ── ADMIN — POST /admin/courses ───────────────────────────────────────────────

router.post("/admin/courses", requireAdmin, async (req, res) => {
  const { title, description, pricePen, status } = req.body as {
    title: string;
    description?: string;
    pricePen: string;
    status?: "draft" | "published";
  };

  if (!title || !pricePen) {
    res.status(400).json({ error: "title y pricePen son requeridos" });
    return;
  }

  const id = randomUUID();
  const slug = await uniqueSlug(title);

  const [course] = await db
    .insert(coursesTable)
    .values({
      id,
      title,
      slug,
      description: description ?? "",
      pricePen,
      status: status ?? "draft",
      createdBy: req.userDbId!,
    })
    .returning();

  res.status(201).json(await enrichCourse(course));
});

// ── ADMIN — PATCH /admin/courses/:id ─────────────────────────────────────────

router.patch("/admin/courses/:id", requireAdmin, async (req, res) => {
  const courseId = req.params.id as string;
  const { title, description, pricePen, status } = req.body as {
    title?: string;
    description?: string;
    pricePen?: string;
    status?: "draft" | "published";
  };

  const course = await db.query.coursesTable.findFirst({
    where: eq(coursesTable.id, courseId),
  });
  if (!course) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) patch.title = title;
  if (description !== undefined) patch.description = description;
  if (pricePen !== undefined) patch.pricePen = pricePen;
  if (status !== undefined) patch.status = status;

  const [updated] = await db
    .update(coursesTable)
    .set(patch)
    .where(eq(coursesTable.id, courseId))
    .returning();

  res.json(await enrichCourse(updated));
});

// ── ADMIN — DELETE /admin/courses/:id ────────────────────────────────────────

router.delete("/admin/courses/:id", requireAdmin, async (req, res) => {
  const courseId = req.params.id as string;
  const course = await db.query.coursesTable.findFirst({
    where: eq(coursesTable.id, courseId),
  });
  if (!course) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(coursesTable).where(eq(coursesTable.id, courseId));
  res.status(204).send();
});

// ── ADMIN — POST /admin/courses/:id/cover ─────────────────────────────────────

router.post(
  "/admin/courses/:id/cover",
  requireAdmin,
  upload.single("cover"),
  async (req, res) => {
    const courseId = req.params.id as string;
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    const course = await db.query.coursesTable.findFirst({
      where: eq(coursesTable.id, courseId),
    });
    if (!course) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ext =
      req.file.mimetype === "image/png"
        ? "png"
        : req.file.mimetype === "image/webp"
          ? "webp"
          : "jpg";
    const subPath = `courses/${courseId}/cover-${randomUUID()}.${ext}`;
    await objectStorageService.uploadToPrivate(
      subPath,
      req.file.buffer,
      req.file.mimetype,
      { owner: req.userId!, visibility: "public" },
    );
    const coverUrl = `/api/storage/objects/${subPath}`;
    const [updated] = await db
      .update(coursesTable)
      .set({ coverUrl, updatedAt: new Date() })
      .where(eq(coursesTable.id, courseId))
      .returning();
    res.json(await enrichCourse(updated));
  },
);

// ── ADMIN — POST /admin/courses/:id/modules ───────────────────────────────────

router.post("/admin/courses/:id/modules", requireAdmin, async (req, res) => {
  const courseId = req.params.id as string;
  const { title, description, videoUrl, orderIndex } = req.body as {
    title: string;
    description?: string;
    videoUrl?: string;
    orderIndex?: number;
  };

  if (!title) {
    res.status(400).json({ error: "title es requerido" });
    return;
  }

  const course = await db.query.coursesTable.findFirst({
    where: eq(coursesTable.id, courseId),
  });
  if (!course) {
    res.status(404).json({ error: "Curso no encontrado" });
    return;
  }

  // Auto-assign order index if not provided
  let idx = orderIndex;
  if (idx === undefined) {
    const existing = await db.query.courseModulesTable.findMany({
      where: eq(courseModulesTable.courseId, courseId),
    });
    idx = existing.length;
  }

  const [module] = await db
    .insert(courseModulesTable)
    .values({
      id: randomUUID(),
      courseId,
      title,
      description: description ?? "",
      videoUrl: videoUrl ?? null,
      orderIndex: idx,
    })
    .returning();

  res.status(201).json(module);
});

// ── ADMIN — PATCH /admin/courses/modules/:moduleId ────────────────────────────

router.patch(
  "/admin/courses/modules/:moduleId",
  requireAdmin,
  async (req, res) => {
    const moduleId = req.params.moduleId as string;
    const { title, description, videoUrl, orderIndex } = req.body as {
      title?: string;
      description?: string;
      videoUrl?: string;
      orderIndex?: number;
    };

    const module = await db.query.courseModulesTable.findFirst({
      where: eq(courseModulesTable.id, moduleId),
    });
    if (!module) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const patch: Record<string, unknown> = {};
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (videoUrl !== undefined) patch.videoUrl = videoUrl;
    if (orderIndex !== undefined) patch.orderIndex = orderIndex;

    const [updated] = await db
      .update(courseModulesTable)
      .set(patch)
      .where(eq(courseModulesTable.id, moduleId))
      .returning();

    res.json(updated);
  },
);

// ── ADMIN — DELETE /admin/courses/modules/:moduleId ───────────────────────────

router.delete(
  "/admin/courses/modules/:moduleId",
  requireAdmin,
  async (req, res) => {
    const moduleId = req.params.moduleId as string;
    await db
      .delete(courseModulesTable)
      .where(eq(courseModulesTable.id, moduleId));
    res.status(204).send();
  },
);

// ── ADMIN — GET /admin/courses/purchases ──────────────────────────────────────

router.get("/admin/courses/purchases", requireAdmin, async (_req, res) => {
  const purchases = await db.query.coursePurchasesTable.findMany({
    where: eq(coursePurchasesTable.status, "pending"),
    orderBy: desc(coursePurchasesTable.createdAt),
  });

  const enriched = await Promise.all(
    purchases.map(async (p) => {
      const [course, buyer] = await Promise.all([
        db.query.coursesTable.findFirst({
          where: eq(coursesTable.id, p.courseId),
        }),
        db.query.usersTable.findFirst({
          where: eq(usersTable.id, p.userId),
        }),
      ]);
      return {
        ...p,
        courseTitle: course?.title ?? "Unknown",
        courseSlug: course?.slug ?? "",
        pricePen: course?.pricePen ?? "0",
        buyerName: buyer?.displayName ?? "Unknown",
        buyerEmail: buyer?.email ?? "",
        buyerAvatar: buyer?.avatarUrl ?? null,
      };
    }),
  );

  res.json(enriched);
});

// ── ADMIN — POST /admin/courses/purchases/:id/approve ─────────────────────────

router.post(
  "/admin/courses/purchases/:id/approve",
  requireAdmin,
  async (req, res) => {
    const purchaseId = req.params.id as string;

    const purchase = await db.query.coursePurchasesTable.findFirst({
      where: eq(coursePurchasesTable.id, purchaseId),
    });
    if (!purchase) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [updated] = await db
      .update(coursePurchasesTable)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(coursePurchasesTable.id, purchaseId))
      .returning();

    // Grant access
    await db
      .insert(courseAccessTable)
      .values({
        id: randomUUID(),
        courseId: purchase.courseId,
        userId: purchase.userId,
      })
      .onConflictDoNothing();

    // Notify buyer
    const course = await db.query.coursesTable.findFirst({
      where: eq(coursesTable.id, purchase.courseId),
    });
    await notify({
      recipientId: purchase.userId,
      type: "course_purchase",
      title: "¡Acceso aprobado!",
      body: `Tu compra de "${course?.title ?? "el curso"}" fue aprobada. Ya puedes acceder a todos los módulos.`,
      link: `/cursos/${course?.slug ?? ""}`,
    }).catch(() => {});

    res.json(updated);
  },
);

// ── ADMIN — POST /admin/courses/purchases/:id/reject ──────────────────────────

router.post(
  "/admin/courses/purchases/:id/reject",
  requireAdmin,
  async (req, res) => {
    const purchaseId = req.params.id as string;
    const { reason } = req.body as { reason: string };

    if (!reason?.trim()) {
      res.status(400).json({ error: "Se requiere un motivo de rechazo" });
      return;
    }

    const purchase = await db.query.coursePurchasesTable.findFirst({
      where: eq(coursePurchasesTable.id, purchaseId),
    });
    if (!purchase) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [updated] = await db
      .update(coursePurchasesTable)
      .set({
        status: "rejected",
        adminNotes: reason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(coursePurchasesTable.id, purchaseId))
      .returning();

    // Notify buyer
    const course = await db.query.coursesTable.findFirst({
      where: eq(coursesTable.id, purchase.courseId),
    });
    await notify({
      recipientId: purchase.userId,
      type: "course_purchase",
      title: "Solicitud de compra rechazada",
      body: `Tu solicitud para "${course?.title ?? "el curso"}" fue rechazada. Motivo: ${reason.trim()}`,
      link: `/cursos/${course?.slug ?? ""}`,
    }).catch(() => {});

    res.json(updated);
  },
);

export default router;

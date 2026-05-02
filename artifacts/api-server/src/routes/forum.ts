import { Router } from "express";
import { eq, sql, and, desc, asc, lt, count } from "drizzle-orm";
import {
  db,
  forumCategoriesTable,
  forumThreadsTable,
  forumPostsTable,
  forumReactionsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/requireAuth";
import { notify } from "../lib/notify";
import { randomUUID } from "crypto";

const router = Router();

const EDIT_WINDOW_MS = 15 * 60 * 1000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áàäâã]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöôõ]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "hilo";
}

async function ensureUniqueSlug(categoryId: string, base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let i = 1;
  while (true) {
    const existing = await db.query.forumThreadsTable.findFirst({
      where: and(
        eq(forumThreadsTable.categoryId, categoryId),
        eq(forumThreadsTable.slug, slug),
        ...(excludeId ? [sql`${forumThreadsTable.id} != ${excludeId}`] : []),
      ),
    });
    if (!existing) return slug;
    slug = `${base}-${i++}`;
  }
}

async function getPostReactions(postId: string, userId?: string) {
  const rows = await db
    .select()
    .from(forumReactionsTable)
    .where(eq(forumReactionsTable.postId, postId));
  const map: Record<string, { count: number; hasReacted: boolean }> = {};
  for (const r of rows) {
    if (!map[r.emoji]) map[r.emoji] = { count: 0, hasReacted: false };
    map[r.emoji].count++;
    if (userId && r.userId === userId) map[r.emoji].hasReacted = true;
  }
  return Object.entries(map).map(([emoji, v]) => ({ emoji, ...v }));
}

async function enrichPost(post: typeof forumPostsTable.$inferSelect, userId?: string) {
  const author = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, post.authorId),
  });
  const reactions = await getPostReactions(post.id, userId);
  return {
    id: post.id,
    threadId: post.threadId,
    authorId: post.authorId,
    authorName: author?.displayName ?? "Anónimo",
    authorAvatar: author?.avatarUrl ?? null,
    body: post.body,
    parentPostId: post.parentPostId ?? null,
    createdAt: post.createdAt,
    editedAt: post.editedAt ?? null,
    reactions,
  };
}

async function enrichThread(thread: typeof forumThreadsTable.$inferSelect) {
  const [author, cat, [{ pc }]] = await Promise.all([
    db.query.usersTable.findFirst({ where: eq(usersTable.id, thread.authorId) }),
    db.query.forumCategoriesTable.findFirst({
      where: eq(forumCategoriesTable.id, thread.categoryId),
    }),
    db
      .select({ pc: count() })
      .from(forumPostsTable)
      .where(eq(forumPostsTable.threadId, thread.id)),
  ]);
  return {
    id: thread.id,
    categoryId: thread.categoryId,
    categorySlug: cat?.slug ?? "",
    authorId: thread.authorId,
    authorName: author?.displayName ?? "Anónimo",
    authorAvatar: author?.avatarUrl ?? null,
    title: thread.title,
    slug: thread.slug,
    pinned: thread.pinned,
    locked: thread.locked,
    postCount: Number(pc),
    createdAt: thread.createdAt,
    lastActivityAt: thread.lastActivityAt,
  };
}

function canEdit(authorId: string, userId: string, createdAt: Date, isAdm: boolean) {
  if (isAdm) return true;
  if (authorId !== userId) return false;
  return Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS;
}

// ── Categories ───────────────────────────────────────────────────────────────

// GET /forum/categories
router.get("/forum/categories", requireAuth, async (_req, res) => {
  const cats = await db
    .select({
      id: forumCategoriesTable.id,
      name: forumCategoriesTable.name,
      slug: forumCategoriesTable.slug,
      description: forumCategoriesTable.description,
      color: forumCategoriesTable.color,
      orderIndex: forumCategoriesTable.orderIndex,
      createdAt: forumCategoriesTable.createdAt,
      threadCount: sql<number>`count(distinct ${forumThreadsTable.id})::int`,
      postCount: sql<number>`count(distinct ${forumPostsTable.id})::int`,
    })
    .from(forumCategoriesTable)
    .leftJoin(
      forumThreadsTable,
      eq(forumThreadsTable.categoryId, forumCategoriesTable.id),
    )
    .leftJoin(
      forumPostsTable,
      eq(forumPostsTable.threadId, forumThreadsTable.id),
    )
    .groupBy(forumCategoriesTable.id)
    .orderBy(asc(forumCategoriesTable.orderIndex), asc(forumCategoriesTable.name));
  res.json(cats);
});

// ── Threads ───────────────────────────────────────────────────────────────────

// GET /forum/categories/:slug/threads
router.get("/forum/categories/:slug/threads", requireAuth, async (req, res) => {
  const slug = req.params.slug as string;
  const { cursor, limit = "20" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 20, 50);

  const cat = await db.query.forumCategoriesTable.findFirst({
    where: eq(forumCategoriesTable.slug, slug),
  });
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  // Fetch pinned threads (always included, no pagination)
  const pinnedRows = await db
    .select()
    .from(forumThreadsTable)
    .where(
      and(
        eq(forumThreadsTable.categoryId, cat.id),
        eq(forumThreadsTable.pinned, true),
      ),
    )
    .orderBy(desc(forumThreadsTable.lastActivityAt));

  // Decode cursor: base64(JSON.stringify({ lastActivityAt, id }))
  let cursorDate: Date | undefined;
  let cursorId: string | undefined;
  if (cursor) {
    try {
      const { lastActivityAt, id } = JSON.parse(
        Buffer.from(cursor, "base64").toString(),
      );
      cursorDate = new Date(lastActivityAt);
      cursorId = id;
    } catch {
      // ignore bad cursor
    }
  }

  // Fetch non-pinned threads with cursor
  const nonPinnedRows = await db
    .select()
    .from(forumThreadsTable)
    .where(
      and(
        eq(forumThreadsTable.categoryId, cat.id),
        eq(forumThreadsTable.pinned, false),
        ...(cursorDate
          ? [
              sql`(${forumThreadsTable.lastActivityAt}, ${forumThreadsTable.id}) < (${cursorDate.toISOString()}, ${cursorId})`,
            ]
          : []),
      ),
    )
    .orderBy(
      desc(forumThreadsTable.lastActivityAt),
      desc(forumThreadsTable.id),
    )
    .limit(lim + 1);

  const hasMore = nonPinnedRows.length > lim;
  const pageRows = nonPinnedRows.slice(0, lim);

  let nextCursor: string | null = null;
  if (hasMore) {
    const last = pageRows[pageRows.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({ lastActivityAt: last.lastActivityAt, id: last.id }),
    ).toString("base64");
  }

  const allItems = [...pinnedRows, ...pageRows];
  const items = await Promise.all(allItems.map(enrichThread));

  res.json({
    items,
    nextCursor,
    categoryName: cat.name,
    categoryColor: cat.color,
  });
});

// POST /forum/threads
router.post("/forum/threads", requireAuth, async (req, res) => {
  const { categorySlug, title, body } = req.body as {
    categorySlug: string;
    title: string;
    body: string;
  };
  if (!categorySlug || !title?.trim() || !body?.trim()) {
    res.status(400).json({ error: "categorySlug, title and body are required" });
    return;
  }

  const cat = await db.query.forumCategoriesTable.findFirst({
    where: eq(forumCategoriesTable.slug, categorySlug),
  });
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const base = slugify(title);
  const slug = await ensureUniqueSlug(cat.id, base);

  const [thread] = await db
    .insert(forumThreadsTable)
    .values({
      id: randomUUID(),
      categoryId: cat.id,
      authorId: req.userId!,
      title: title.trim(),
      slug,
      body: body.trim(),
    })
    .returning();

  res.status(201).json(await enrichThread(thread));
});

// GET /forum/threads/:threadId
router.get("/forum/threads/:threadId", requireAuth, async (req, res) => {
  const threadId = req.params.threadId as string;
  const thread = await db.query.forumThreadsTable.findFirst({
    where: eq(forumThreadsTable.id, threadId),
  });
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  const rawPosts = await db
    .select()
    .from(forumPostsTable)
    .where(eq(forumPostsTable.threadId, threadId))
    .orderBy(asc(forumPostsTable.createdAt));

  const [base, posts] = await Promise.all([
    enrichThread(thread),
    Promise.all(rawPosts.map((p) => enrichPost(p, req.userId))),
  ]);

  res.json({ ...base, body: thread.body, posts });
});

// PATCH /forum/threads/:threadId
router.patch("/forum/threads/:threadId", requireAuth, async (req, res) => {
  const threadId = req.params.threadId as string;
  const { title, body } = req.body as { title?: string; body?: string };
  const isAdm = req.isAdmin === true;

  const thread = await db.query.forumThreadsTable.findFirst({
    where: eq(forumThreadsTable.id, threadId),
  });
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  if (!canEdit(thread.authorId, req.userId!, thread.createdAt, isAdm)) {
    res.status(403).json({ error: "Edit window expired" });
    return;
  }

  const updates: Partial<typeof forumThreadsTable.$inferInsert> = {};
  if (title?.trim()) updates.title = title.trim();
  if (body?.trim()) updates.body = body.trim();

  const [updated] = await db
    .update(forumThreadsTable)
    .set(updates)
    .where(eq(forumThreadsTable.id, threadId))
    .returning();

  res.json(await enrichThread(updated));
});

// DELETE /forum/threads/:threadId
router.delete("/forum/threads/:threadId", requireAuth, async (req, res) => {
  const threadId = req.params.threadId as string;
  const isAdm = req.isAdmin === true;

  const thread = await db.query.forumThreadsTable.findFirst({
    where: eq(forumThreadsTable.id, threadId),
  });
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  if (!isAdm && thread.authorId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(forumThreadsTable).where(eq(forumThreadsTable.id, threadId));
  res.status(204).send();
});

// ── Posts (replies) ──────────────────────────────────────────────────────────

// POST /forum/threads/:threadId/posts
router.post("/forum/threads/:threadId/posts", requireAuth, async (req, res) => {
  const threadId = req.params.threadId as string;
  const { body, parentPostId } = req.body as {
    body: string;
    parentPostId?: string | null;
  };

  if (!body?.trim()) {
    res.status(400).json({ error: "body is required" });
    return;
  }

  const thread = await db.query.forumThreadsTable.findFirst({
    where: eq(forumThreadsTable.id, threadId),
  });
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  if (thread.locked) {
    res.status(403).json({ error: "thread_locked" });
    return;
  }

  const [post] = await db
    .insert(forumPostsTable)
    .values({
      id: randomUUID(),
      threadId,
      authorId: req.userId!,
      body: body.trim(),
      parentPostId: parentPostId ?? null,
    })
    .returning();

  // Update thread last_activity_at
  await db
    .update(forumThreadsTable)
    .set({ lastActivityAt: new Date() })
    .where(eq(forumThreadsTable.id, threadId));

  // Notify thread author (skip if replying to self)
  if (thread.authorId !== req.userId) {
    notify({
      recipientId: thread.authorId,
      type: "forum_reply",
      title: "Nueva respuesta en tu hilo",
      body: `Alguien respondió en "${thread.title}"`,
      link: `/foro/${thread.slug}`,
    }).catch(() => {});
  }

  res.status(201).json(await enrichPost(post, req.userId));
});

// PATCH /forum/posts/:postId
router.patch("/forum/posts/:postId", requireAuth, async (req, res) => {
  const postId = req.params.postId as string;
  const { body } = req.body as { body: string };
  const isAdm = req.isAdmin === true;

  if (!body?.trim()) {
    res.status(400).json({ error: "body is required" });
    return;
  }

  const post = await db.query.forumPostsTable.findFirst({
    where: eq(forumPostsTable.id, postId),
  });
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  if (!canEdit(post.authorId, req.userId!, post.createdAt, isAdm)) {
    res.status(403).json({ error: "Edit window expired" });
    return;
  }

  const [updated] = await db
    .update(forumPostsTable)
    .set({ body: body.trim(), editedAt: new Date() })
    .where(eq(forumPostsTable.id, postId))
    .returning();

  res.json(await enrichPost(updated, req.userId));
});

// DELETE /forum/posts/:postId
router.delete("/forum/posts/:postId", requireAuth, async (req, res) => {
  const postId = req.params.postId as string;
  const isAdm = req.isAdmin === true;

  const post = await db.query.forumPostsTable.findFirst({
    where: eq(forumPostsTable.id, postId),
  });
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  if (!isAdm && post.authorId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(forumPostsTable).where(eq(forumPostsTable.id, postId));
  res.status(204).send();
});

// ── Reactions ────────────────────────────────────────────────────────────────

// POST /forum/posts/:postId/reactions
router.post("/forum/posts/:postId/reactions", requireAuth, async (req, res) => {
  const postId = req.params.postId as string;
  const { emoji } = req.body as { emoji: string };

  if (!emoji) {
    res.status(400).json({ error: "emoji is required" });
    return;
  }

  const post = await db.query.forumPostsTable.findFirst({
    where: eq(forumPostsTable.id, postId),
  });
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const existing = await db.query.forumReactionsTable.findFirst({
    where: and(
      eq(forumReactionsTable.postId, postId),
      eq(forumReactionsTable.userId, req.userId!),
      eq(forumReactionsTable.emoji, emoji),
    ),
  });

  if (existing) {
    await db
      .delete(forumReactionsTable)
      .where(eq(forumReactionsTable.id, existing.id));
  } else {
    await db.insert(forumReactionsTable).values({
      id: randomUUID(),
      postId,
      userId: req.userId!,
      emoji,
    });
  }

  const reactions = await getPostReactions(postId, req.userId);
  res.json(reactions);
});

// ── Admin actions ────────────────────────────────────────────────────────────

// POST /admin/forum/threads/:threadId/pin
router.post("/admin/forum/threads/:threadId/pin", requireAdmin, async (req, res) => {
  const threadId = req.params.threadId as string;
  const thread = await db.query.forumThreadsTable.findFirst({
    where: eq(forumThreadsTable.id, threadId),
  });
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  const [updated] = await db
    .update(forumThreadsTable)
    .set({ pinned: !thread.pinned })
    .where(eq(forumThreadsTable.id, threadId))
    .returning();
  res.json(await enrichThread(updated));
});

// POST /admin/forum/threads/:threadId/lock
router.post("/admin/forum/threads/:threadId/lock", requireAdmin, async (req, res) => {
  const threadId = req.params.threadId as string;
  const thread = await db.query.forumThreadsTable.findFirst({
    where: eq(forumThreadsTable.id, threadId),
  });
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  const [updated] = await db
    .update(forumThreadsTable)
    .set({ locked: !thread.locked })
    .where(eq(forumThreadsTable.id, threadId))
    .returning();
  res.json(await enrichThread(updated));
});

export default router;

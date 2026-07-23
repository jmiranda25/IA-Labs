import { Router } from "express";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { db, usersTable, refreshTokensTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { randomUUID, randomBytes, createHash } from "crypto";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "@workspace/auth";
import rateLimit from "express-rate-limit";
import { sendEmail } from "../lib/sendEmail";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos, por favor intenta más tarde" },
  standardHeaders: true,
  legacyHeaders: false,
});

const BOOTSTRAP_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  displayName: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueTokenPair(userId: string, email: string, role: string) {
  const accessToken = generateAccessToken(userId, email, role);
  const refreshToken = generateRefreshToken(userId);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokensTable).values({
    id: randomUUID(),
    userId,
    tokenHash,
    expiresAt,
  });

  return { accessToken, refreshToken };
}

function generateUsername(base: string): string {
  return base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20) || "member";
}

async function uniqueUsername(preferred: string): Promise<string> {
  const candidate = generateUsername(preferred);
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, candidate),
    columns: { username: true },
  });
  if (!existing) return candidate;
  const suffix = randomUUID().replace(/-/g, "").slice(0, 6);
  return `${candidate.slice(0, 14)}_${suffix}`;
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post("/auth/register", authLimiter, async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
      return;
    }

    const { email, password, displayName } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, normalizedEmail),
      columns: { id: true },
    });

    if (existing) {
      res.status(409).json({ error: "Este email ya está en uso" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = randomUUID();
    const isBootstrapAdmin = BOOTSTRAP_ADMIN_EMAILS.has(normalizedEmail);
    const username = await uniqueUsername(displayName);

    const [user] = await db
      .insert(usersTable)
      .values({
        id: userId,
        clerkId: userId, // reuse id field for native-auth users
        email: normalizedEmail,
        username,
        displayName,
        passwordHash,
        role: isBootstrapAdmin ? "administrator" : "participant",
        status: isBootstrapAdmin ? "active" : "pending",
        skills: [],
      })
      .returning();

    const { accessToken, refreshToken } = await issueTokenPair(
      user.id,
      user.email!,
      user.role
    );

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    console.error("POST /auth/register error:", (err as Error)?.message ?? err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos" });
      return;
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, normalizedEmail),
    });

    if (!user || !user.passwordHash) {
      // Constant-time rejection to prevent user enumeration
      await bcrypt.hash(password, 12);
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    // Bootstrap admin self-heal on every login
    let effectiveUser = user;
    if (
      BOOTSTRAP_ADMIN_EMAILS.has(normalizedEmail) &&
      (user.role !== "administrator" || user.status !== "active")
    ) {
      const [updated] = await db
        .update(usersTable)
        .set({ status: "active", role: "administrator", updatedAt: new Date() })
        .where(eq(usersTable.id, user.id))
        .returning();
      effectiveUser = updated;
    }

    const { accessToken, refreshToken } = await issueTokenPair(
      effectiveUser.id,
      effectiveUser.email!,
      effectiveUser.role
    );

    res.json({ user: effectiveUser, accessToken, refreshToken });
  } catch (err) {
    console.error("POST /auth/login error:", (err as Error)?.message ?? err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ error: "Refresh token requerido" });
    return;
  }

  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    res.status(401).json({ error: "Refresh token inválido" });
    return;
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await db.query.refreshTokensTable.findFirst({
    where: and(
      eq(refreshTokensTable.tokenHash, tokenHash),
      eq(refreshTokensTable.userId, payload.userId),
      gt(refreshTokensTable.expiresAt, new Date())
    ),
  });

  if (!stored || stored.revokedAt) {
    res.status(401).json({ error: "Refresh token revocado o expirado" });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, payload.userId),
    columns: { id: true, email: true, role: true, status: true },
  });

  if (!user || user.status === "rejected") {
    res.status(401).json({ error: "Usuario no encontrado o acceso revocado" });
    return;
  }

  // Rotate: revoke old token and issue a fresh pair
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.tokenHash, tokenHash));

  const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(
    user.id,
    user.email!,
    user.role
  );

  res.json({ accessToken, refreshToken: newRefreshToken });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/auth/logout", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.tokenHash, tokenHash))
      .catch(() => {});
  }
  res.json({ ok: true });
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

const GENERIC_FORGOT_MESSAGE =
  "Si existe una cuenta con ese email, te enviamos instrucciones para restablecer tu contraseña.";

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
router.post("/auth/forgot-password", authLimiter, async (req, res) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Email inválido" });
      return;
    }

    const normalizedEmail = parsed.data.email.toLowerCase();

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, normalizedEmail),
      columns: { id: true, email: true, displayName: true, passwordHash: true },
    });

    // Always return the same response, whether or not the account exists,
    // so this endpoint can't be used to enumerate registered emails.
    if (user?.passwordHash) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(passwordResetTokensTable).values({
        id: randomUUID(),
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const resetUrl = `${process.env.FRONTEND_URL ?? ""}/recuperar/${rawToken}`;
      void sendEmail({
        email: user.email!,
        subject: "Restablece tu contraseña — IA Labs",
        body: `Hola ${user.displayName},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nHaz clic en el siguiente enlace para crear una nueva contraseña (válido por 1 hora):\n${resetUrl}\n\nSi no solicitaste esto, puedes ignorar este correo — tu contraseña actual sigue funcionando.\n\nEl equipo de IA Labs`,
      });
    }

    res.json({ message: GENERIC_FORGOT_MESSAGE });
  } catch (err) {
    console.error("POST /auth/forgot-password error:", (err as Error)?.message ?? err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
router.post("/auth/reset-password", authLimiter, async (req, res) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
      return;
    }

    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);

    const resetToken = await db.query.passwordResetTokensTable.findFirst({
      where: and(
        eq(passwordResetTokensTable.tokenHash, tokenHash),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, new Date())
      ),
    });

    if (!resetToken) {
      res.status(400).json({ error: "El enlace es inválido o ya expiró" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db
      .update(usersTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, resetToken.userId));

    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, resetToken.id));

    // Invalidate all existing sessions so a stolen/old session can't outlive the reset.
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.userId, resetToken.userId));

    res.json({ ok: true });
  } catch (err) {
    console.error("POST /auth/reset-password error:", (err as Error)?.message ?? err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;

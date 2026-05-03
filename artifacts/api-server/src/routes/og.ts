import { Router } from "express";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router = Router();

// ── Font loading (lazy, cached) ───────────────────────────────────────────────
type FontCache = { regular: ArrayBuffer; bold: ArrayBuffer };
let fontCache: FontCache | null = null;

async function loadFonts(): Promise<FontCache> {
  if (fontCache) return fontCache;
  const [regular, bold] = await Promise.all([
    fetch("https://cdn.jsdelivr.net/fontsource/fonts/inter@5/latin-400-normal.woff").then(
      (r) => r.arrayBuffer(),
    ),
    fetch("https://cdn.jsdelivr.net/fontsource/fonts/inter@5/latin-700-normal.woff").then(
      (r) => r.arrayBuffer(),
    ),
  ]);
  fontCache = { regular, bold };
  return fontCache;
}

// ── Minimal h() helper — produces React.createElement-compatible nodes ────────
function h(
  type: string,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): { type: string; props: Record<string, unknown>; key: null } {
  const flat = children.flat().filter((c) => c !== null && c !== undefined && c !== false && c !== "");
  return {
    type,
    key: null,
    props: {
      ...(props ?? {}),
      ...(flat.length > 0 ? { children: flat.length === 1 ? flat[0] : flat } : {}),
    },
  };
}

// ── Fetch avatar as base64 data-URI (satori requires embedded images) ─────────
async function fetchAvatarDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${ct};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

// ── Build satori element tree ─────────────────────────────────────────────────
function buildOgElement(
  user: {
    displayName: string;
    username: string;
    bio?: string | null;
    role: string;
    location?: string | null;
    skills: string[];
  },
  avatarDataUri: string | null,
) {
  const isAdmin = user.role === "administrator";
  const initials = user.displayName.charAt(0).toUpperCase();
  const skills = user.skills.slice(0, 3);
  const bio = user.bio ? (user.bio.length > 85 ? user.bio.slice(0, 85) + "…" : user.bio) : null;

  const avatarEl = avatarDataUri
    ? h("img", {
        src: avatarDataUri,
        width: 110,
        height: 110,
        style: {
          borderRadius: "50%",
          objectFit: "cover",
          border: "3px solid rgba(124,58,237,0.7)",
        },
      })
    : h(
        "div",
        {
          style: {
            width: "110px",
            height: "110px",
            borderRadius: "50%",
            backgroundColor: "rgba(124,58,237,0.25)",
            border: "3px solid rgba(124,58,237,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "44px",
            fontWeight: 700,
            color: "#a78bfa",
          },
        },
        initials,
      );

  const nameRow = h(
    "div",
    { style: { display: "flex", flexDirection: "row", alignItems: "center", gap: "14px" } },
    h(
      "div",
      {
        style: {
          fontSize: "42px",
          fontWeight: 700,
          color: "#f1f5f9",
          lineHeight: "1.1",
          letterSpacing: "-0.5px",
        },
      },
      user.displayName,
    ),
    isAdmin
      ? h(
          "div",
          {
            style: {
              fontSize: "13px",
              fontWeight: 600,
              color: "#a78bfa",
              backgroundColor: "rgba(124,58,237,0.18)",
              border: "1px solid rgba(124,58,237,0.45)",
              borderRadius: "6px",
              padding: "4px 12px",
              marginTop: "4px",
            },
          },
          "Admin",
        )
      : null,
  );

  const usernameEl = h(
    "div",
    { style: { fontSize: "20px", color: "#7c3aed", fontWeight: 500 } },
    `@${user.username}`,
  );

  const infoChildren: unknown[] = [nameRow, usernameEl];

  if (bio) {
    infoChildren.push(
      h(
        "div",
        {
          style: {
            fontSize: "18px",
            color: "#94a3b8",
            lineHeight: "1.45",
            maxWidth: "700px",
            marginTop: "4px",
          },
        },
        bio,
      ),
    );
  }

  if (user.location) {
    infoChildren.push(
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "6px",
            marginTop: "2px",
          },
        },
        h("div", { style: { fontSize: "16px", color: "#64748b" } }, "📍"),
        h("div", { style: { fontSize: "16px", color: "#64748b" } }, user.location),
      ),
    );
  }

  const infoCol = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        flex: "1",
      },
    },
    ...infoChildren,
  );

  const topRow = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "36px",
      },
    },
    avatarEl,
    infoCol,
  );

  const skillsRow =
    skills.length > 0
      ? h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "row",
              gap: "10px",
            },
          },
          ...skills.map((s) =>
            h(
              "div",
              {
                style: {
                  fontSize: "15px",
                  color: "#cbd5e1",
                  backgroundColor: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.13)",
                  borderRadius: "8px",
                  padding: "6px 16px",
                },
              },
              s,
            ),
          ),
        )
      : null;

  const brandingRow = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
    },
    h("div", { style: { fontSize: "14px", color: "#475569" } }, "comunidad-ia.com"),
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "8px",
        },
      },
      h(
        "div",
        { style: { fontSize: "26px", color: "#7c3aed", lineHeight: "1" } },
        "⚡",
      ),
      h(
        "div",
        {
          style: {
            fontSize: "22px",
            fontWeight: 700,
            color: "#f1f5f9",
            letterSpacing: "-0.5px",
          },
        },
        "Comunidad IA",
      ),
    ),
  );

  const contentChildren: unknown[] = [topRow];
  if (skillsRow) contentChildren.push(skillsRow);
  contentChildren.push(brandingRow);

  const contentCol = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px",
        flex: "1",
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
      },
    },
    ...contentChildren,
  );

  return h(
    "div",
    {
      style: {
        display: "flex",
        width: "1200px",
        height: "630px",
        backgroundColor: "#0d1117",
        backgroundImage:
          "linear-gradient(135deg, #0a0e1a 0%, #0d1117 55%, #120a24 100%)",
        fontFamily: "Inter",
        position: "relative",
        overflow: "hidden",
      },
    },
    // Decorative orbs
    h("div", {
      style: {
        position: "absolute",
        top: "-120px",
        right: "-120px",
        width: "520px",
        height: "520px",
        borderRadius: "50%",
        backgroundImage:
          "radial-gradient(circle, rgba(124,58,237,0.28) 0%, rgba(124,58,237,0.04) 60%, transparent 70%)",
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        bottom: "-100px",
        left: "380px",
        width: "320px",
        height: "320px",
        borderRadius: "50%",
        backgroundImage:
          "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
      },
    }),
    // Top accent line
    h("div", {
      style: {
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        height: "3px",
        backgroundImage: "linear-gradient(90deg, transparent, #7c3aed, #a78bfa, transparent)",
      },
    }),
    contentCol,
  );
}

// ── GET /api/og/m/:username ───────────────────────────────────────────────────
router.get("/og/m/:username", async (req, res) => {
  const { username } = req.params as { username: string };

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, username),
    columns: {
      displayName: true,
      username: true,
      bio: true,
      avatarUrl: true,
      role: true,
      location: true,
      skills: true,
      isPublic: true,
    },
  });

  if (!user || !user.isPublic) {
    res.status(404).setHeader("Content-Type", "image/png");
    // Return a minimal 1x1 transparent PNG for 404
    const tiny1x1 = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    res.end(tiny1x1);
    return;
  }

  try {
    const [fonts, avatarDataUri] = await Promise.all([
      loadFonts(),
      user.avatarUrl ? fetchAvatarDataUri(user.avatarUrl) : Promise.resolve(null),
    ]);

    const element = buildOgElement(
      {
        ...user,
        username: user.username ?? username,
        skills: (user.skills as string[]) ?? [],
      },
      avatarDataUri,
    );

    const svg = await satori(element as Parameters<typeof satori>[0], {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: fonts.regular, weight: 400, style: "normal" },
        { name: "Inter", data: fonts.bold, weight: 700, style: "normal" },
      ],
    });

    const resvg = new Resvg(svg, { background: "rgba(0,0,0,0)" });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    res
      .status(200)
      .setHeader("Content-Type", "image/png")
      .setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400")
      .end(pngBuffer);
  } catch (err) {
    req.log.error({ err }, "OG image generation failed");
    res.status(500).json({ error: "OG image generation failed" });
  }
});

export default router;

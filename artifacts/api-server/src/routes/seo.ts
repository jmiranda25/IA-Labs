import { Router } from "express";
import {
  db,
  eventsTable,
  forumCategoriesTable,
  forumThreadsTable,
  resourcesTable,
  marketplaceListingsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const DOMAIN =
  process.env["PUBLIC_DOMAIN"] ?? "https://aicommunity.app";

function escXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function urlEntry(loc: string, lastmod?: string, priority = "0.7") {
  const mod = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : "";
  return `  <url>\n    <loc>${escXml(DOMAIN + loc)}</loc>${mod}\n    <priority>${priority}</priority>\n  </url>`;
}

router.get("/sitemap.xml", async (req, res) => {
  try {
    const [events, categories, threads, resources, listings] =
      await Promise.all([
        db
          .select({ slug: eventsTable.slug, updatedAt: eventsTable.updatedAt })
          .from(eventsTable),
        db
          .select({ id: forumCategoriesTable.id, slug: forumCategoriesTable.slug })
          .from(forumCategoriesTable),
        db
          .select({
            id: forumThreadsTable.id,
            categoryId: forumThreadsTable.categoryId,
            lastActivityAt: forumThreadsTable.lastActivityAt,
          })
          .from(forumThreadsTable)
          .limit(200),
        db
          .select({ slug: resourcesTable.slug, createdAt: resourcesTable.createdAt })
          .from(resourcesTable)
          .where(eq(resourcesTable.published, true)),
        db
          .select({
            slug: marketplaceListingsTable.slug,
            updatedAt: marketplaceListingsTable.updatedAt,
          })
          .from(marketplaceListingsTable)
          .where(eq(marketplaceListingsTable.status, "active")),
      ]);

    const catSlugById: Record<string, string> = {};
    for (const c of categories) {
      catSlugById[c.id] = c.slug;
    }

    const today = new Date().toISOString();

    const staticUrls = [
      urlEntry("/", today, "1.0"),
      urlEntry("/eventos", today, "0.9"),
      urlEntry("/foro", today, "0.9"),
      urlEntry("/recursos", today, "0.9"),
      urlEntry("/marketplace", today, "0.8"),
      urlEntry("/miembros", today, "0.7"),
    ];

    const eventUrls = events.map((e) =>
      urlEntry(`/eventos/${e.slug}`, e.updatedAt?.toISOString(), "0.7"),
    );

    const categoryUrls = categories.map((c) =>
      urlEntry(`/foro/${c.slug}`, today, "0.7"),
    );

    const threadUrls = threads
      .flatMap((t) => {
        const catSlug = catSlugById[t.categoryId];
        if (!catSlug) return [];
        return [urlEntry(`/foro/${catSlug}/${t.id}`, t.lastActivityAt?.toISOString(), "0.5")];
      });

    const resourceUrls = resources.map((r) =>
      urlEntry(`/recursos/${r.slug}`, r.createdAt?.toISOString(), "0.6"),
    );

    const listingUrls = listings.map((l) =>
      urlEntry(`/marketplace/${l.slug}`, l.updatedAt?.toISOString(), "0.6"),
    );

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...staticUrls,
      ...eventUrls,
      ...categoryUrls,
      ...threadUrls,
      ...resourceUrls,
      ...listingUrls,
      "</urlset>",
    ].join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    req.log.error({ err }, "sitemap generation failed");
    res.status(500).send('<?xml version="1.0"?><error>Internal error</error>');
  }
});

export default router;

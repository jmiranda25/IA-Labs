import { Router } from "express";
import { eq, sql, and, desc, ilike, or } from "drizzle-orm";
import {
  db,
  forumCategoriesTable,
  forumPostsTable,
  forumRepliesTable,
  forumReactionsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

async function getReactions(targetType: string, targetId: string, userId?: string) {
  const reactions = await db.query.forumReactionsTable.findMany({
    where: and(
      eq(forumReactionsTable.targetType, targetType),
      eq(forumReactionsTable.targetId, targetId)
    ),
  });
  const counts: Record<string, { count: number; hasReacted: boolean }> = {};
  for (const r of reactions) {
    if (!counts[r.emoji]) counts[r.emoji] = { count: 0, hasReacted: false };
    counts[r.emoji].count++;
    if (userId && r.userId === userId) counts[r.emoji].hasReacted = true;
  }
  return Object.entries(counts).map(([emoji, { count, hasReacted }]) => ({ emoji, count, hasReacted }));
}

async function enrichReply(reply: typeof forumRepliesTable.$inferSelect, userId?: string, allReplies?: typeof forumRepliesTable.$inferSelect[]): Promise<unknown> {
  const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, reply.authorId) });
  const reactions = await getReactions("reply", reply.id, userId);
  const children = (allReplies ?? [])
    .filter((r) => r.parentReplyId === reply.id)
    .map((r) => enrichReply(r, userId, []));
  return {
    ...reply,
    authorName: author?.displayName ?? "Unknown",
    authorAvatar: author?.avatarUrl ?? null,
    reactions,
    children: await Promise.all(children),
  };
}

// GET /forum/categories
router.get("/forum/categories", async (_req, res) => {
  const cats = await db.query.forumCategoriesTable.findMany({ orderBy: forumCategoriesTable.name });
  res.json(cats);
});

// POST /forum/categories
router.post("/forum/categories", requireAdmin, async (req, res) => {
  const { name, slug, description, color } = req.body;
  const [cat] = await db.insert(forumCategoriesTable).values({ id: randomUUID(), name, slug, description, color }).returning();
  res.status(201).json(cat);
});

// GET /forum/posts
router.get("/forum/posts", async (req, res) => {
  const { categoryId, search, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const conditions = [];
  if (categoryId) conditions.push(eq(forumPostsTable.categoryId, categoryId));
  if (search) conditions.push(or(ilike(forumPostsTable.title, `%${search}%`), ilike(forumPostsTable.body, `%${search}%`)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const posts = await db.query.forumPostsTable.findMany({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    orderBy: [desc(forumPostsTable.isPinned), desc(forumPostsTable.lastActivityAt)],
  });
  const total = await db.select({ count: sql<number>`count(*)` }).from(forumPostsTable).where(where);
  const enriched = await Promise.all(posts.map(async (p) => {
    const cat = await db.query.forumCategoriesTable.findFirst({ where: eq(forumCategoriesTable.id, p.categoryId) });
    const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, p.authorId) });
    return { ...p, categoryName: cat?.name ?? "", authorName: author?.displayName ?? "Unknown", authorAvatar: author?.avatarUrl ?? null };
  }));
  res.json({ posts: enriched, total: Number(total[0]?.count ?? 0) });
});

// POST /forum/posts
router.post("/forum/posts", requireAuth, async (req, res) => {
  const { categoryId, title, body } = req.body;
  const [post] = await db.insert(forumPostsTable).values({
    id: randomUUID(), categoryId, authorId: req.userId!, title, body,
  }).returning();
  await db.update(forumCategoriesTable).set({ postCount: sql`post_count + 1` }).where(eq(forumCategoriesTable.id, categoryId));
  const cat = await db.query.forumCategoriesTable.findFirst({ where: eq(forumCategoriesTable.id, categoryId) });
  const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
  res.status(201).json({ ...post, categoryName: cat?.name ?? "", authorName: author?.displayName ?? "Unknown", authorAvatar: author?.avatarUrl ?? null });
});

// GET /forum/posts/trending
router.get("/forum/posts/trending", async (req, res) => {
  const { limit = "5" } = req.query as Record<string, string>;
  const posts = await db.query.forumPostsTable.findMany({
    limit: parseInt(limit),
    orderBy: [desc(forumPostsTable.reactionCount), desc(forumPostsTable.replyCount)],
  });
  const enriched = await Promise.all(posts.map(async (p) => {
    const cat = await db.query.forumCategoriesTable.findFirst({ where: eq(forumCategoriesTable.id, p.categoryId) });
    const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, p.authorId) });
    return { ...p, categoryName: cat?.name ?? "", authorName: author?.displayName ?? "Unknown", authorAvatar: author?.avatarUrl ?? null };
  }));
  res.json(enriched);
});

// GET /forum/posts/:postId
router.get("/forum/posts/:postId", async (req, res) => {
  const postId = req.params.postId as string;
  const post = await db.query.forumPostsTable.findFirst({ where: eq(forumPostsTable.id, postId) });
  if (!post) { res.status(404).json({ error: "Not found" }); return; }
  const cat = await db.query.forumCategoriesTable.findFirst({ where: eq(forumCategoriesTable.id, post.categoryId) });
  const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, post.authorId) });
  const allReplies = await db.query.forumRepliesTable.findMany({
    where: eq(forumRepliesTable.postId, post.id), orderBy: forumRepliesTable.createdAt,
  });
  const topReplies = allReplies.filter((r) => !r.parentReplyId);
  const enrichedReplies = await Promise.all(topReplies.map((r) => enrichReply(r, req.userId, allReplies)));
  const reactions = await getReactions("post", post.id, req.userId);
  res.json({ ...post, categoryName: cat?.name ?? "", authorName: author?.displayName ?? "Unknown", authorAvatar: author?.avatarUrl ?? null, replies: enrichedReplies, reactions });
});

// PUT /forum/posts/:postId
router.put("/forum/posts/:postId", requireAuth, async (req, res) => {
  const postId = req.params.postId as string;
  const { title, body, isPinned, isLocked } = req.body;
  const [updated] = await db.update(forumPostsTable).set({ title, body, isPinned, isLocked, updatedAt: new Date() })
    .where(eq(forumPostsTable.id, postId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  const cat = await db.query.forumCategoriesTable.findFirst({ where: eq(forumCategoriesTable.id, updated.categoryId) });
  const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, updated.authorId) });
  res.json({ ...updated, categoryName: cat?.name ?? "", authorName: author?.displayName ?? "Unknown", authorAvatar: author?.avatarUrl ?? null });
});

// DELETE /forum/posts/:postId
router.delete("/forum/posts/:postId", requireAuth, async (req, res) => {
  const postId = req.params.postId as string;
  await db.delete(forumPostsTable).where(eq(forumPostsTable.id, postId));
  res.status(204).send();
});

// GET /forum/posts/:postId/replies
router.get("/forum/posts/:postId/replies", async (req, res) => {
  const postId = req.params.postId as string;
  const allReplies = await db.query.forumRepliesTable.findMany({
    where: eq(forumRepliesTable.postId, postId), orderBy: forumRepliesTable.createdAt,
  });
  const topReplies = allReplies.filter((r) => !r.parentReplyId);
  const enriched = await Promise.all(topReplies.map((r) => enrichReply(r, req.userId, allReplies)));
  res.json(enriched);
});

// POST /forum/posts/:postId/replies
router.post("/forum/posts/:postId/replies", requireAuth, async (req, res) => {
  const postId = req.params.postId as string;
  const { body, parentReplyId } = req.body;
  const [reply] = await db.insert(forumRepliesTable).values({
    id: randomUUID(), postId, parentReplyId: parentReplyId ?? null, authorId: req.userId!, body,
  }).returning();
  await db.update(forumPostsTable).set({ replyCount: sql`reply_count + 1`, lastActivityAt: new Date() })
    .where(eq(forumPostsTable.id, postId));
  res.status(201).json(await enrichReply(reply, req.userId, []));
});

// PUT /forum/replies/:replyId
router.put("/forum/replies/:replyId", requireAuth, async (req, res) => {
  const replyId = req.params.replyId as string;
  const [updated] = await db.update(forumRepliesTable).set({ body: req.body.body, updatedAt: new Date() })
    .where(eq(forumRepliesTable.id, replyId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichReply(updated, req.userId, []));
});

// DELETE /forum/replies/:replyId
router.delete("/forum/replies/:replyId", requireAuth, async (req, res) => {
  const replyId = req.params.replyId as string;
  await db.delete(forumRepliesTable).where(eq(forumRepliesTable.id, replyId));
  res.status(204).send();
});

// POST /forum/reactions
router.post("/forum/reactions", requireAuth, async (req, res) => {
  const { targetType, targetId, emoji } = req.body;
  const existing = await db.query.forumReactionsTable.findFirst({
    where: and(
      eq(forumReactionsTable.targetType, targetType),
      eq(forumReactionsTable.targetId, targetId),
      eq(forumReactionsTable.userId, req.userId!),
      eq(forumReactionsTable.emoji, emoji)
    ),
  });
  if (existing) {
    await db.delete(forumReactionsTable).where(eq(forumReactionsTable.id, existing.id));
  } else {
    await db.insert(forumReactionsTable).values({ id: randomUUID(), targetType, targetId, userId: req.userId!, emoji });
  }
  if (targetType === "post") {
    const [cnt] = await db.select({ count: sql<number>`count(*)` }).from(forumReactionsTable).where(and(eq(forumReactionsTable.targetType, "post"), eq(forumReactionsTable.targetId, targetId)));
    await db.update(forumPostsTable).set({ reactionCount: Number(cnt?.count ?? 0) }).where(eq(forumPostsTable.id, targetId));
  }
  const reactions = await getReactions(targetType, targetId, req.userId);
  res.json({ reactions });
});

export default router;

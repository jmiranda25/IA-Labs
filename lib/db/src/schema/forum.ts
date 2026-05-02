import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const forumCategoriesTable = pgTable("forum_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  color: text("color").notNull().default("blue"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const forumThreadsTable = pgTable("forum_threads", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").notNull(),
  authorId: text("author_id").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  body: text("body").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  locked: boolean("locked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
});

export const forumPostsTable = pgTable("forum_posts", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  authorId: text("author_id").notNull(),
  body: text("body").notNull(),
  parentPostId: text("parent_post_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
});

export const forumReactionsTable = pgTable("forum_reactions", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  userId: text("user_id").notNull(),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertForumCategorySchema = createInsertSchema(forumCategoriesTable).omit({
  createdAt: true,
});
export const insertForumThreadSchema = createInsertSchema(forumThreadsTable).omit({
  createdAt: true,
  lastActivityAt: true,
});
export const insertForumPostSchema = createInsertSchema(forumPostsTable).omit({
  createdAt: true,
  editedAt: true,
});
export const insertForumReactionSchema = createInsertSchema(forumReactionsTable).omit({
  createdAt: true,
});

export type InsertForumCategory = z.infer<typeof insertForumCategorySchema>;
export type ForumCategory = typeof forumCategoriesTable.$inferSelect;
export type ForumThread = typeof forumThreadsTable.$inferSelect;
export type ForumPost = typeof forumPostsTable.$inferSelect;
export type ForumReaction = typeof forumReactionsTable.$inferSelect;

// Legacy aliases (kept so stale imports fail with a clear type error, not silent any)
export const forumRepliesTable = undefined as never;

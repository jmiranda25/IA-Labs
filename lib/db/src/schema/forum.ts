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
  color: text("color").notNull().default("#7C3AED"),
  postCount: integer("post_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const forumPostsTable = pgTable("forum_posts", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").notNull(),
  authorId: text("author_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  replyCount: integer("reply_count").notNull().default(0),
  reactionCount: integer("reaction_count").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const forumRepliesTable = pgTable("forum_replies", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  parentReplyId: text("parent_reply_id"),
  authorId: text("author_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const forumReactionsTable = pgTable("forum_reactions", {
  id: text("id").primaryKey(),
  targetType: text("target_type").notNull(), // "post" | "reply"
  targetId: text("target_id").notNull(),
  userId: text("user_id").notNull(),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertForumCategorySchema = createInsertSchema(
  forumCategoriesTable,
).omit({ postCount: true, createdAt: true });
export const insertForumPostSchema = createInsertSchema(forumPostsTable).omit({
  replyCount: true,
  reactionCount: true,
  lastActivityAt: true,
  createdAt: true,
  updatedAt: true,
});
export const insertForumReplySchema = createInsertSchema(
  forumRepliesTable,
).omit({ createdAt: true, updatedAt: true });
export const insertForumReactionSchema = createInsertSchema(
  forumReactionsTable,
).omit({ createdAt: true });

export type InsertForumCategory = z.infer<typeof insertForumCategorySchema>;
export type ForumCategory = typeof forumCategoriesTable.$inferSelect;
export type ForumPost = typeof forumPostsTable.$inferSelect;
export type ForumReply = typeof forumRepliesTable.$inferSelect;
export type ForumReaction = typeof forumReactionsTable.$inferSelect;

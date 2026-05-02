import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const moderationItemsTable = pgTable("moderation_items", {
  id: text("id").primaryKey(),
  contentType: text("content_type").notNull(),
  contentId: text("content_id").notNull(),
  reason: text("reason").notNull(),
  reportedBy: text("reported_by").notNull(),
  status: text("status").notNull().default("pending"),
  note: text("note"),
  resolvedBy: text("resolved_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertModerationItemSchema = createInsertSchema(
  moderationItemsTable,
).omit({ createdAt: true, resolvedAt: true });
export type InsertModerationItem = z.infer<typeof insertModerationItemSchema>;
export type ModerationItem = typeof moderationItemsTable.$inferSelect;

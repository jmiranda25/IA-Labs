import { pgTable, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketplaceListingsTable = pgTable("marketplace_listings", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("offering"),
  status: text("status").notNull().default("active"),
  tags: jsonb("tags").notNull().default([]),
  imageUrl: text("image_url"),
  authorId: text("author_id").notNull(),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const marketplaceMessagesTable = pgTable("marketplace_messages", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").notNull(),
  senderId: text("sender_id").notNull(),
  receiverId: text("receiver_id").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertListingSchema = createInsertSchema(
  marketplaceListingsTable,
).omit({ messageCount: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(
  marketplaceMessagesTable,
).omit({ createdAt: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type MarketplaceListing = typeof marketplaceListingsTable.$inferSelect;
export type MarketplaceMessage = typeof marketplaceMessagesTable.$inferSelect;

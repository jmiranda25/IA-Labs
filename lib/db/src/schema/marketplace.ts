import {
  pgTable, pgEnum, text, numeric, timestamp, integer, index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const listingStatusEnum = pgEnum("listing_status", [
  "draft", "pending", "active", "sold", "rejected",
]);

export const marketplaceListingsTable = pgTable("marketplace_listings", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  price: numeric("price"),
  currency: text("currency").notNull().default("USD"),
  category: text("category").notNull(),
  status: listingStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listingImagesTable = pgTable("listing_images", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").notNull().references(() => marketplaceListingsTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const listingMessagesTable = pgTable(
  "listing_messages",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id").notNull().references(() => marketplaceListingsTable.id, { onDelete: "cascade" }),
    fromId: text("from_id").notNull().references(() => usersTable.id),
    toId: text("to_id").notNull().references(() => usersTable.id),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("listing_messages_to_id_read_at_idx").on(t.toId, t.readAt)],
);

export type MarketplaceListing = typeof marketplaceListingsTable.$inferSelect;
export type ListingImage = typeof listingImagesTable.$inferSelect;
export type ListingMessage = typeof listingMessagesTable.$inferSelect;

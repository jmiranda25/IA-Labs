import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const referralLinksTable = pgTable("referral_links", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label"),
  createdBy: text("created_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  usesCount: integer("uses_count").notNull().default(0),
  maxUses: integer("max_uses"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ReferralLink = typeof referralLinksTable.$inferSelect;

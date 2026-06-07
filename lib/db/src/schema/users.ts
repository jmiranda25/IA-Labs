import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  passwordHash: text("password_hash"),
  email: text("email").unique(),
  username: text("username").unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("participant"),
  skills: jsonb("skills").notNull().default([]),
  location: text("location"),
  website: text("website"),
  isPublic: boolean("is_public").notNull().default(true),
  isBanned: boolean("is_banned").notNull().default(false),
  disabledAt: timestamp("disabled_at"),
  notificationPreferences: jsonb("notification_preferences").notNull().default({
    forum_reply: true,
    event_rsvp: true,
    marketplace_message: true,
    admin_action: true,
    resource_status: true,
    listing_status: true,
  }),
  status: text("status").notNull().default("pending"),
  referredBy: text("referred_by"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  joinedAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

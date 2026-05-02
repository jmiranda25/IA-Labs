import { pgTable, text, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const landingSectionsTable = pgTable("landing_sections", {
  id: text("id").primaryKey(),
  section: text("section").notNull().unique(),
  title: text("title"),
  subtitle: text("subtitle"),
  body: text("body"),
  imageUrl: text("image_url"),
  orderIndex: integer("order_index").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  content: jsonb("content").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const landingFaqsTable = pgTable("landing_faqs", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLandingSectionSchema = createInsertSchema(landingSectionsTable).omit({ updatedAt: true });
export const insertLandingFaqSchema = createInsertSchema(landingFaqsTable).omit({ updatedAt: true });

export type InsertLandingSection = z.infer<typeof insertLandingSectionSchema>;
export type InsertLandingFaq = z.infer<typeof insertLandingFaqSchema>;
export type LandingSection = typeof landingSectionsTable.$inferSelect;
export type LandingFaq = typeof landingFaqsTable.$inferSelect;

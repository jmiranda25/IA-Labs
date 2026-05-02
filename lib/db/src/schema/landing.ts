import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const landingSectionsTable = pgTable("landing_sections", {
  id: text("id").primaryKey(),
  section: text("section").notNull().unique(),
  content: jsonb("content").notNull().default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLandingSectionSchema = createInsertSchema(
  landingSectionsTable,
).omit({ updatedAt: true });
export type InsertLandingSection = z.infer<typeof insertLandingSectionSchema>;
export type LandingSection = typeof landingSectionsTable.$inferSelect;

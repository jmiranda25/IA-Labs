import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    location: text("location"),
    capacity: integer("capacity"),
    isOnline: boolean("is_online").notNull().default(false),
    meetingUrl: text("meeting_url"),
    coverUrl: text("cover_url"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("events_starts_at_idx").on(table.startsAt)],
);

export const rsvpsTable = pgTable(
  "rsvps",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    status: text("status").notNull().default("going"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("rsvps_event_user_idx").on(table.eventId, table.userId),
    index("rsvps_event_status_idx").on(table.eventId, table.status),
    index("rsvps_user_idx").on(table.userId),
  ],
);

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertRsvpSchema = createInsertSchema(rsvpsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
export type EventRsvp = typeof rsvpsTable.$inferSelect;

// Keep the old name as an alias so any file that hasn't been updated yet still compiles.
export const eventRsvpsTable = rsvpsTable;

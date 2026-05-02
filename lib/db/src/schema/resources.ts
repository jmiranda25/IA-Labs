import {
  pgTable,
  pgEnum,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const resourceTypeEnum = pgEnum("resource_type", [
  "link",
  "file",
  "course",
]);

export const resourcesTable = pgTable("resources", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  type: resourceTypeEnum("type").notNull(),
  url: text("url"),
  filePath: text("file_path"),
  description: text("description").notNull().default(""),
  coverUrl: text("cover_url"),
  authorId: text("author_id")
    .notNull()
    .references(() => usersTable.id),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const resourceTagsTable = pgTable(
  "resource_tags",
  {
    id: text("id").primaryKey(),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resourcesTable.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [
    uniqueIndex("resource_tags_resource_id_tag_unique").on(t.resourceId, t.tag),
    index("resource_tags_tag_idx").on(t.tag),
  ],
);

export type Resource = typeof resourcesTable.$inferSelect;
export type ResourceTag = typeof resourceTagsTable.$inferSelect;

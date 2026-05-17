import {
  pgTable,
  pgEnum,
  text,
  numeric,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const courseStatusEnum = pgEnum("course_status", ["draft", "published"]);

export const coursePurchaseStatusEnum = pgEnum("course_purchase_status", [
  "pending",
  "approved",
  "rejected",
]);

export const coursesTable = pgTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  pricePen: numeric("price_pen", { precision: 10, scale: 2 }).notNull(),
  coverUrl: text("cover_url"),
  status: courseStatusEnum("status").notNull().default("draft"),
  createdBy: text("created_by")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const courseModulesTable = pgTable(
  "course_modules",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    videoUrl: text("video_url"),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("course_modules_course_id_idx").on(t.courseId)],
);

export const coursePurchasesTable = pgTable(
  "course_purchases",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    yapeOperationCode: text("yape_operation_code").notNull(),
    status: coursePurchaseStatusEnum("status").notNull().default("pending"),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("course_purchases_course_user_unique").on(t.courseId, t.userId),
    index("course_purchases_status_idx").on(t.status),
  ],
);

export const courseAccessTable = pgTable(
  "course_access",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("course_access_course_user_unique").on(t.courseId, t.userId),
  ],
);

export type Course = typeof coursesTable.$inferSelect;
export type CourseModule = typeof courseModulesTable.$inferSelect;
export type CoursePurchase = typeof coursePurchasesTable.$inferSelect;
export type CourseAccess = typeof courseAccessTable.$inferSelect;

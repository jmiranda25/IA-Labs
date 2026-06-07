-- Add missing columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_by" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_preferences" jsonb NOT NULL DEFAULT '{"forum_reply":true,"event_rsvp":true,"marketplace_message":true,"admin_action":true,"resource_status":true,"listing_status":true}';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabled_at" timestamp;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users"("email");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users"("username");
--> statement-breakpoint
-- Add missing columns to landing_sections table
ALTER TABLE "landing_sections" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "landing_sections" ADD COLUMN IF NOT EXISTS "subtitle" text;
ALTER TABLE "landing_sections" ADD COLUMN IF NOT EXISTS "body" text;
ALTER TABLE "landing_sections" ADD COLUMN IF NOT EXISTS "image_url" text;
ALTER TABLE "landing_sections" ADD COLUMN IF NOT EXISTS "order_index" integer NOT NULL DEFAULT 0;
ALTER TABLE "landing_sections" ADD COLUMN IF NOT EXISTS "enabled" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "landing_faqs" (
  "id" text PRIMARY KEY NOT NULL,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "order_index" integer NOT NULL DEFAULT 0,
  "enabled" boolean NOT NULL DEFAULT true,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_links" (
  "id" text PRIMARY KEY NOT NULL,
  "code" text NOT NULL UNIQUE,
  "label" text,
  "created_by" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "uses_count" integer NOT NULL DEFAULT 0,
  "max_uses" integer,
  "expires_at" timestamp,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
  "id" text PRIMARY KEY NOT NULL,
  "target_type" text NOT NULL,
  "target_id" text NOT NULL,
  "reporter_id" text NOT NULL,
  "reason" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "resolved_at" timestamp
);

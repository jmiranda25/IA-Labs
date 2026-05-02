import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DEFAULT_OBJECT_STORAGE_BUCKET_ID: z.string().optional(),
  PRIVATE_OBJECT_DIR: z.string().optional(),
  PUBLIC_OBJECT_SEARCH_PATHS: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
});

function validateEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${missing}\n\nFix the above env vars and restart.`);
  }
  return result.data;
}

export const env = validateEnv();

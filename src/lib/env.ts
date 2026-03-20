import { z } from "zod/v4";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  ADMIN_SECRET: z.string().min(16, "ADMIN_SECRET must be at least 16 characters").optional().default("raeth-default-admin-secret"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function parseEnv() {
  // Skip strict validation in test environment
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test",
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "test-key",
      ADMIN_SECRET: process.env.ADMIN_SECRET || "raeth-default-admin-secret",
      NODE_ENV: "test" as const,
    };
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("⚠️ Invalid environment variables:", JSON.stringify(result.error.format(), null, 2));
    // Don't crash — return what we can with safe defaults
    return {
      DATABASE_URL: process.env.DATABASE_URL || "",
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
      ADMIN_SECRET: process.env.ADMIN_SECRET || "raeth-default-admin-secret",
      NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "production",
    };
  }
  return result.data;
}

export const env = parseEnv();

import { z } from "zod/v4";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  ADMIN_SECRET: z.string().min(16, "ADMIN_SECRET must be at least 16 characters"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function parseEnv() {
  // Skip strict validation in test environment
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test",
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "test-key",
      ADMIN_SECRET: process.env.ADMIN_SECRET,
      NODE_ENV: "test" as const,
    };
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.format());
    throw new Error("Missing or invalid environment variables. See logs above.");
  }
  return result.data;
}

export const env = parseEnv();

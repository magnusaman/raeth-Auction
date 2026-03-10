import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabasePath(): string {
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  // Strip "file:" prefix
  const raw = dbUrl.replace(/^file:/, "");
  // Absolute path (e.g. /app/data/raeth.db) → use as-is
  if (path.isAbsolute(raw)) return raw;
  // Relative path (e.g. ./dev.db) → resolve from cwd
  return path.join(process.cwd(), raw);
}

function createPrismaClient() {
  const dbPath = resolveDatabasePath();
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

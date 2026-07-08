/**
 * Prisma Client singleton for Next.js.
 *
 * In development, Next.js hot-reloads create new module instances on every
 * change, which would exhaust the PostgreSQL connection pool. The global
 * singleton pattern prevents that by reusing the same PrismaClient instance
 * across hot-reloads.
 *
 * SECURITY: This file must only be imported in server-side code (Route
 * Handlers, Server Actions, Server Components). It is not exported from any
 * client boundary and reads no values that end up in the client bundle.
 */

import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in environment variables.");
  }
  
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

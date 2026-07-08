/**
 * Prisma 7 Configuration File
 *
 * In Prisma 7, the datasource connection URL was moved out of schema.prisma
 * and into this file. This separates connection concerns from schema definition.
 *
 * SECURITY: DATABASE_URL is loaded from .env.local via dotenv — it is NEVER
 * exposed to the client bundle. This file is only used by the Prisma CLI
 * (migrate, generate, studio) and is NOT imported into Next.js route handlers.
 *
 * See: https://pris.ly/d/config-datasource
 */

import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local (used by Next.js) and fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});

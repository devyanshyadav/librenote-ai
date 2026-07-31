import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { env } from "@/env";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn =
  globalForDb.conn ??
  postgres(env.DATABASE_URL, {
    prepare: false, // Required for Supabase connection pooling
    max: 5, // Limit max connections to prevent EMAXCONNSESSION
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });

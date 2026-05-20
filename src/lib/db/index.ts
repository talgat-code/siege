import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool: Pool };

function createPool(): Pool {
  const url = process.env.DATABASE_URL!;
  const isProd = process.env.NODE_ENV === "production";
  const ssl = isProd ? { rejectUnauthorized: false } : false;

  // postgres.js can't parse IPv6 bracket notation — use pg with parsed params
  if (url.includes("[") && url.includes("]:")) {
    // URL like: postgresql://user:pass@[ipv6addr]:port/db
    const match = url.match(
      /postgresql:\/\/([^:]+):([^@]+)@\[([^\]]+)\]:(\d+)\/(.+)/
    );
    if (match) {
      const [, user, password, host, port, database] = match;
      return new Pool({ user, password, host, port: Number(port), database, ssl });
    }
  }

  return new Pool({ connectionString: url, ssl });
}

const pool = globalForDb.pool ?? createPool();

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export * from "./schema";

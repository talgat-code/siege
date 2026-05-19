import type { Config } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit doesn't load .env.local automatically
config({ path: ".env.local" });

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;

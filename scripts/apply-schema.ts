/**
 * Apply supabase/schema.sql to the database.
 *
 * Requires DATABASE_URL in .env.local — get it from:
 *   Supabase dashboard → Settings → Database → Connection string → URI
 * Then add to .env.local:
 *   DATABASE_URL="postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:6543/postgres"
 *
 * Run: npx tsx scripts/apply-schema.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in environment. See script header for instructions.");
  process.exit(1);
}

const sql = readFileSync(join(process.cwd(), "supabase/schema.sql"), "utf8");

// Supabase pooler uses a self-signed cert; strip sslmode query param and handle SSL explicitly
const parsed = new URL(url.replace(/^postgres:\/\//, "postgresql://"));
parsed.searchParams.delete("sslmode");
const client = new Client({
  connectionString: parsed.toString(),
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log("Connected. Applying schema…");
  await client.query(sql);
  console.log("Schema applied successfully.");
  await client.end();
}

run().catch((err) => {
  console.error("Schema application failed:", err.message);
  process.exit(1);
});

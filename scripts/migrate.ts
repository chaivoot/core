// รัน migration ก่อน build
// - บน Vercel รันเฉพาะ production (preview ไม่แตะฐานข้อมูลจริง)
// - ถ้ายังไม่ได้ตั้ง DATABASE_URL จะข้ามไป
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  const vercelEnv = process.env.VERCEL_ENV;

  if (vercelEnv && vercelEnv !== "production") {
    console.log(`[migrate] skip on VERCEL_ENV=${vercelEnv}`);
    return;
  }
  if (!url) {
    console.warn("[migrate] DATABASE_URL is not set, skipping migrations");
    return;
  }

  const migrationsFolder = "./drizzle";
  if (url.includes(".neon.tech")) {
    await migrateNeon(drizzleNeon(neon(url)), { migrationsFolder });
  } else {
    const db = drizzlePg(url);
    await migratePg(db, { migrationsFolder });
    await db.$client.end();
  }
  console.log("[migrate] done");
}

main().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});

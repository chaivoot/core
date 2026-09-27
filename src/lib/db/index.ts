import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

function isNeon(url: string) {
  return url.includes(".neon.tech");
}

function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (isNeon(url)) return drizzleNeon(neon(url), { schema });
  // Postgres ปกติ (ใช้ตอนพัฒนา/ทดสอบในเครื่อง) - API ของ query ที่เราใช้เหมือนกัน
  return drizzlePg(url, { schema }) as unknown as DB;
}

let instance: DB | undefined;

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    instance ??= createDb();
    return Reflect.get(instance, prop, instance);
  },
});

export { schema };

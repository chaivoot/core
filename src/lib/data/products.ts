import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// สินค้าเป็นข้อมูลกลางของระบบ (ไม่ผูกกับผู้ใช้) อ่านได้ทุกคน แก้ไขได้เฉพาะผู้ดูแล
// ผู้เรียกฟังก์ชันที่แก้ไขข้อมูลต้องเช็กสิทธิ์ด้วย requireAdmin() ก่อนเสมอ

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProductInput = {
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  pv: number;
  bv: number;
  days: number;
  sortOrder: number;
};

const order = [
  asc(schema.products.sortOrder),
  asc(schema.products.category),
  asc(schema.products.name),
];

export async function listActiveProducts() {
  return db
    .select()
    .from(schema.products)
    .where(eq(schema.products.active, true))
    .orderBy(...order);
}

export async function listAllProducts() {
  return db.select().from(schema.products).orderBy(...order);
}

export async function isAdmin(userId: string) {
  const [u] = await db
    .select({ isAdmin: schema.users.isAdmin })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return u?.isAdmin === true;
}

export async function createProduct(input: ProductInput) {
  await db.insert(schema.products).values(input);
}

export async function updateProduct(id: string, input: ProductInput) {
  if (!UUID.test(id)) return;
  await db
    .update(schema.products)
    .set({ ...input, updatedAt: sql`now()` })
    .where(eq(schema.products.id, id));
}

export async function setProductActive(id: string, active: boolean) {
  if (!UUID.test(id)) return;
  await db
    .update(schema.products)
    .set({ active, updatedAt: sql`now()` })
    .where(eq(schema.products.id, id));
}

export async function deleteProduct(id: string) {
  if (!UUID.test(id)) return;
  await db.delete(schema.products).where(eq(schema.products.id, id));
}

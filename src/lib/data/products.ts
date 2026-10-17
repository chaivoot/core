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
  const [row] = await db
    .insert(schema.products)
    .values(input)
    .returning({ id: schema.products.id });
  return row.id;
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

/** รูปที่รับได้ (ตรวจจาก byte แรกของไฟล์ ไม่เชื่อชนิดที่ browser ส่งมา) */
export function detectImageType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const tag = (i: number) => String.fromCharCode(...bytes.slice(i, i + 4));
  if (tag(0) === "RIFF" && tag(8) === "WEBP") return "image/webp";
  return null;
}

export async function setProductImage(id: string, contentType: string, bytes: Uint8Array) {
  if (!UUID.test(id)) return;
  const data = Buffer.from(bytes).toString("base64");
  await db
    .insert(schema.productImages)
    .values({ productId: id, contentType, data })
    .onConflictDoUpdate({
      target: schema.productImages.productId,
      set: { contentType, data, updatedAt: sql`now()` },
    });
  await db
    .update(schema.products)
    .set({ imageUpdatedAt: sql`now()` })
    .where(eq(schema.products.id, id));
}

export async function removeProductImage(id: string) {
  if (!UUID.test(id)) return;
  await db.delete(schema.productImages).where(eq(schema.productImages.productId, id));
  await db.update(schema.products).set({ imageUpdatedAt: null }).where(eq(schema.products.id, id));
}

export async function getProductImage(id: string) {
  if (!UUID.test(id)) return null;
  const [row] = await db
    .select({ contentType: schema.productImages.contentType, data: schema.productImages.data })
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, id));
  return row ?? null;
}

/** URL รูปสินค้า (มี v= ต่อท้าย เปลี่ยนรูปแล้วไม่ติดแคชเก่า) */
export function productImageUrl(p: { id: string; imageUpdatedAt: Date | null }) {
  return p.imageUpdatedAt ? `/plan/products/${p.id}/image?v=${p.imageUpdatedAt.getTime()}` : null;
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createProduct,
  deleteProduct,
  detectImageType,
  removeProductImage,
  setProductActive,
  setProductImage,
  updateProduct,
} from "@/lib/data/products";
import { formObject, optionalText } from "@/lib/forms";
import { requireAdmin } from "@/lib/session";

const amount = z.coerce.number().min(0).max(10_000_000);

const productSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    category: optionalText(100),
    description: optionalText(500),
    price: amount,
    pv: amount,
    // เว้นว่าง = เท่ากับราคา (บีวีของสินค้าแอมเวย์ไทยเท่ากับราคานักธุรกิจ)
    bv: z.preprocess((v) => (typeof v === "string" && v.trim() ? v : null), amount.nullable()),
    days: z.coerce.number().int().min(1).max(3650),
    sortOrder: z.coerce.number().int().min(-1000).max(1000).catch(10),
  })
  .transform((p) => ({ ...p, bv: p.bv ?? p.price }));

// รูปถูกย่อในเบราว์เซอร์ก่อนส่ง จึงเล็กกว่านี้มาก (ลิมิตของ server action คือ 1MB)
const MAX_IMAGE_BYTES = 900_000;

/** บันทึก/ลบรูปตามฟอร์ม: คืน false ถ้าไฟล์ไม่ใช่รูปที่รับได้ */
async function saveImage(id: string, formData: FormData) {
  if (formData.get("removeImage") === "on") {
    await removeProductImage(id);
    return true;
  }
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return true;
  if (file.size > MAX_IMAGE_BYTES) return false;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) return false;
  await setProductImage(id, type, bytes);
  return true;
}

function done(ok: string, imageOk = true) {
  revalidatePath("/plan");
  revalidatePath("/plan/products");
  redirect(imageOk ? `/plan/products?ok=${ok}` : "/plan/products?e=image");
}

export async function addProductAction(formData: FormData) {
  await requireAdmin();
  const parsed = productSchema.safeParse(formObject(formData));
  if (!parsed.success) redirect("/plan/products?e=invalid");
  const id = await createProduct(parsed.data);
  done("added", await saveImage(id, formData));
}

export async function updateProductAction(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = productSchema.safeParse(formObject(formData));
  if (!parsed.success) redirect("/plan/products?e=invalid");
  await updateProduct(id, parsed.data);
  done("saved", await saveImage(id, formData));
}

export async function setProductActiveAction(id: string, active: boolean) {
  await requireAdmin();
  await setProductActive(id, active);
  done(active ? "shown" : "hidden");
}

export async function deleteProductAction(id: string) {
  await requireAdmin();
  await deleteProduct(id);
  done("deleted");
}

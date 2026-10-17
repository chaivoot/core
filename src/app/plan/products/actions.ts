"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createProduct,
  deleteProduct,
  setProductActive,
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

function done(ok: string) {
  revalidatePath("/plan");
  revalidatePath("/plan/products");
  redirect(`/plan/products?ok=${ok}`);
}

export async function addProductAction(formData: FormData) {
  await requireAdmin();
  const parsed = productSchema.safeParse(formObject(formData));
  if (!parsed.success) redirect("/plan/products?e=invalid");
  await createProduct(parsed.data);
  done("added");
}

export async function updateProductAction(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = productSchema.safeParse(formObject(formData));
  if (!parsed.success) redirect("/plan/products?e=invalid");
  await updateProduct(id, parsed.data);
  done("saved");
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

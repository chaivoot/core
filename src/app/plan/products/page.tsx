import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/submit-button";
import { listAllProducts, productImageUrl } from "@/lib/data/products";
import type { Product } from "@/lib/db/schema";
import { fmt } from "@/lib/plan";
import { requireAdmin } from "@/lib/session";
import {
  addProductAction,
  deleteProductAction,
  setProductActiveAction,
  updateProductAction,
} from "./actions";
import { ImageInput } from "./image-input";

export const metadata = { title: "ข้อมูลสินค้า · 3S1M" };

const MESSAGES: Record<string, string> = {
  added: "เพิ่มสินค้าแล้ว",
  saved: "บันทึกแล้ว",
  hidden: "ซ่อนสินค้าแล้ว (ไม่แสดงตอนอธิบายแผน)",
  shown: "แสดงสินค้าแล้ว",
  deleted: "ลบสินค้าแล้ว",
};

export default async function ProductsAdminPage({ searchParams }: PageProps<"/plan/products">) {
  await requireAdmin();
  const { ok, e } = await searchParams;
  const products = await listAllProducts();
  const categories = [...new Set(products.map((p) => p.category).filter((c): c is string => !!c))];

  return (
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">หลังบ้าน</p>
          <h1 className="text-2xl font-bold text-stone-900">ข้อมูลสินค้า</h1>
        </div>
        <Link href="/plan" className="btn-secondary">
          ไปหน้าอธิบายแผน
        </Link>
      </header>

      {typeof ok === "string" && MESSAGES[ok] && (
        <p className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{MESSAGES[ok]}</p>
      )}
      {e === "invalid" && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          ข้อมูลไม่ครบ: ต้องมีชื่อ ราคา พีวี และจำนวนวันที่ใช้ได้ (อย่างน้อย 1 วัน)
        </p>
      )}
      {e === "image" && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          บันทึกข้อมูลแล้ว แต่ใช้รูปนี้ไม่ได้ (รับเฉพาะ JPG, PNG, WebP) ลองเลือกรูปใหม่อีกครั้ง
        </p>
      )}

      <datalist id="categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <section className="card space-y-3">
        <h2 className="font-semibold text-stone-900">เพิ่มสินค้า</h2>
        <form action={addProductAction} className="space-y-3">
          <ProductFields />
          <SubmitButton className="btn-primary w-full">เพิ่มสินค้า</SubmitButton>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-stone-900">สินค้าทั้งหมด ({products.length})</h2>
        {products.length === 0 && <p className="text-sm text-stone-500">ยังไม่มีสินค้า</p>}
        <ul className="space-y-2">
          {products.map((p) => (
            <li key={p.id}>
              <details className={`card ${p.active ? "" : "opacity-60"}`}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                  <ProductThumb url={productImageUrl(p)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-stone-500">
                      {p.category ?? "ไม่มีหมวด"}
                      {!p.active && " · ซ่อนอยู่"}
                    </div>
                    <div className="font-medium text-stone-900">{p.name}</div>
                    {p.description && <div className="text-sm text-stone-500">{p.description}</div>}
                    <div className="text-sm text-stone-600">
                      ฿{fmt(p.price)} · {fmt(p.pv)} PV · ใช้ได้ {p.days} วัน
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold text-teal-800">฿{fmt(p.price / p.days)}</div>
                    <div className="text-xs text-stone-500">ต่อวัน</div>
                  </div>
                </summary>
                <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
                  <form action={updateProductAction.bind(null, p.id)} className="space-y-3">
                    <ProductFields product={p} />
                    <SubmitButton className="btn-primary w-full">บันทึก</SubmitButton>
                  </form>
                  <div className="flex gap-2">
                    <form action={setProductActiveAction.bind(null, p.id, !p.active)} className="flex-1">
                      <SubmitButton className="btn-secondary w-full" pendingText="…">
                        {p.active ? "ซ่อน" : "แสดง"}
                      </SubmitButton>
                    </form>
                    <form action={deleteProductAction.bind(null, p.id)} className="flex-1">
                      <ConfirmSubmitButton message={`ลบ "${p.name}" ?`} className="btn-danger w-full">
                        ลบ
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function ProductThumb({ url }: { url: string | null }) {
  return (
    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-stone-200">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- รูปจาก route ของเราเอง แคชไว้แล้ว
        <img src={url} alt="" className="size-full object-contain" loading="lazy" />
      ) : (
        <span className="text-[10px] text-stone-400">ไม่มีรูป</span>
      )}
    </div>
  );
}

function ProductFields({ product }: { product?: Product }) {
  return (
    <>
      <ImageInput current={product ? productImageUrl(product) : null} />
      <label className="block">
        <span className="label">ชื่อสินค้า</span>
        <input name="name" required maxLength={200} defaultValue={product?.name} className="input" />
      </label>
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <label className="block">
          <span className="label">หมวด</span>
          <input
            name="category"
            list="categories"
            maxLength={100}
            defaultValue={product?.category ?? ""}
            placeholder="เช่น อาหารเสริม"
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">ลำดับ</span>
          <input
            name="sortOrder"
            type="number"
            step="1"
            defaultValue={product?.sortOrder ?? 10}
            className="input"
          />
        </label>
      </div>
      <label className="block">
        <span className="label">รายละเอียด (ไม่บังคับ)</span>
        <input
          name="description"
          maxLength={500}
          defaultValue={product?.description ?? ""}
          placeholder="เช่น ในชุดมีอะไรบ้าง"
          className="input"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="label">ราคา (บาท)</span>
          <input name="price" type="number" step="0.01" min="0" required defaultValue={product?.price} className="input" />
        </label>
        <label className="block">
          <span className="label">ใช้ได้กี่วัน</span>
          <input name="days" type="number" step="1" min="1" required defaultValue={product?.days} className="input" />
        </label>
        <label className="block">
          <span className="label">PV</span>
          <input name="pv" type="number" step="0.01" min="0" required defaultValue={product?.pv} className="input" />
        </label>
        <label className="block">
          <span className="label">BV</span>
          <input
            name="bv"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product && product.bv !== product.price ? product.bv : ""}
            placeholder="เท่ากับราคา"
            className="input"
          />
        </label>
      </div>
    </>
  );
}

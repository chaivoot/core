import Link from "next/link";
import { isAdmin, listActiveProducts, productImageUrl } from "@/lib/data/products";
import { requireUser } from "@/lib/session";
import { PlanStory, type PlanProduct } from "./plan-story";

export const metadata = { title: "อธิบายแผนธุรกิจ · 3S1M" };

// เฉพาะผู้ใช้ที่ล็อกอินและได้รับเชิญแล้ว (ใช้ตอนนั่งอธิบายแผนให้คนใหม่ดูจากเครื่องของเรา)
export default async function PlanPage() {
  const user = await requireUser();
  const [rows, admin] = await Promise.all([listActiveProducts(), isAdmin(user.id)]);
  const products: PlanProduct[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    price: p.price,
    pv: p.pv,
    bv: p.bv,
    days: p.days,
    image: productImageUrl(p),
  }));

  return (
    <>
      <PlanStory products={products} />
      {admin && (
        <Link
          href="/plan/products"
          className="fixed top-3 right-3 z-20 rounded-full bg-white/90 px-3 py-1.5 text-xs text-stone-600 shadow-sm ring-1 ring-stone-200 print:hidden"
        >
          ข้อมูลสินค้า
        </Link>
      )}
    </>
  );
}

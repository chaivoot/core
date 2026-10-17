import { getProductImage } from "@/lib/data/products";

// รูปสินค้าเป็นข้อมูลสาธารณะ (หน้าอธิบายแผนเปิดได้โดยไม่ต้องล็อกอิน)
export async function GET(_req: Request, ctx: RouteContext<"/plan/products/[id]/image">) {
  const { id } = await ctx.params;
  const image = await getProductImage(id);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(image.data, "base64"), {
    headers: {
      "Content-Type": image.contentType,
      "X-Content-Type-Options": "nosniff",
      // URL มีเวอร์ชันต่อท้าย เปลี่ยนรูปแล้ว URL เปลี่ยน จึงแคชได้นาน
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

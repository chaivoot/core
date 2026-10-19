import { getProductImage } from "@/lib/data/products";
import { getCurrentUser } from "@/lib/session";

// ใช้ได้เฉพาะผู้ใช้ที่ได้รับเชิญแล้ว เหมือนหน้าอธิบายแผน
export async function GET(_req: Request, ctx: RouteContext<"/plan/products/[id]/image">) {
  const user = await getCurrentUser();
  if (!user?.granted) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const image = await getProductImage(id);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(image.data, "base64"), {
    headers: {
      "Content-Type": image.contentType,
      "X-Content-Type-Options": "nosniff",
      // URL มีเวอร์ชันต่อท้าย เปลี่ยนรูปแล้ว URL เปลี่ยน จึงแคชได้นาน (private = แคชเฉพาะในเครื่องผู้ใช้ ไม่แคชที่ CDN)
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

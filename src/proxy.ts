import { NextResponse, type NextRequest } from "next/server";

/** หน้าสาธารณะที่คนพิมพ์เองบ่อย: ถ้าพิมพ์ตัวพิมพ์ใหญ่ (เช่น /SME, /Cashflow/ABCD) ให้พาไปตัวเล็ก */
const PUBLIC = ["sme", "cashflow"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first = "", ...rest] = pathname.split("/");
  const lower = first.toLowerCase();
  if (first === lower || !PUBLIC.includes(lower)) return NextResponse.next();
  const url = request.nextUrl.clone();
  // แก้เฉพาะส่วนแรกของ path · ส่วนที่เหลือ (เช่นรหัสห้อง) คงไว้ตามเดิม
  url.pathname = ["", lower, ...rest].join("/");
  return NextResponse.redirect(url, 308);
}

// matcher ต้องเป็นค่าคงที่ จึงเขียน regex ทุกตัวพิมพ์ไว้ตรง ๆ (sme, cashflow)
export const config = {
  matcher: ["/:p([sS][mM][eE])", "/:p([cC][aA][sS][hH][fF][lL][oO][wW])/:path*"],
};

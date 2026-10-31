import type { Metadata } from "next";

// เปิดสาธารณะ (ไม่ต้องล็อกอิน) แต่ไม่ให้ search engine เก็บ
export const metadata: Metadata = { robots: { index: false, follow: false } };

// ทุกหน้าของเกมกระแสเงินสดใช้ตัวอักษรใหญ่ขึ้น (ดู html:has([data-cashflow]) ใน globals.css)
export default function CashflowLayout({ children }: LayoutProps<"/cashflow">) {
  return <div data-cashflow="">{children}</div>;
}

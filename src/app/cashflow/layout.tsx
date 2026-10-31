// ทุกหน้าของเกมกระแสเงินสดใช้ตัวอักษรใหญ่ขึ้น (ดู html:has([data-cashflow]) ใน globals.css)
export default function CashflowLayout({ children }: LayoutProps<"/cashflow">) {
  return <div data-cashflow="">{children}</div>;
}

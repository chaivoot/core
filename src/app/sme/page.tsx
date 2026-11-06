import type { Metadata } from "next";
import { Mitr } from "next/font/google";
import { SmeSimulator } from "./simulator";

// หัวข้อแบบเกม: ตัวอักษรกลมหนา
const mitr = Mitr({ weight: ["500", "600"], subsets: ["thai", "latin"], variable: "--font-mitr" });

// เปิดสาธารณะ แต่ไม่ให้ search engine เก็บ (เหมือน /cashflow)
export const metadata: Metadata = {
  title: "จำลองแผนเปิดธุรกิจ · 3S1M",
  description: "คำนวณเงินที่ต้องมีเพื่อเริ่มธุรกิจของตัวเอง เก็บกี่ปีถึงพอ และโอกาสรอดของธุรกิจใหม่",
  robots: { index: false, follow: false },
};

export default function SmePage() {
  return (
    <div className={mitr.variable}>
      <SmeSimulator />
    </div>
  );
}

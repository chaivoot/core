import type { Metadata } from "next";
import { Anuphan, Prompt } from "next/font/google";
import { SmeSimulator } from "./simulator";

// เปิดสาธารณะ แต่ไม่ให้ search engine เก็บ (เหมือน /cashflow)
export const metadata: Metadata = {
  title: "จำลองแผนเปิดธุรกิจ · 3S1M",
  description: "คำนวณเงินที่ต้องมีเพื่อเริ่มธุรกิจของตัวเอง เก็บกี่ปีถึงพอ และโอกาสรอดของธุรกิจใหม่",
  robots: { index: false, follow: false },
};

// Prompt = หัวข้อและตัวเลขเด่น · Anuphan = เนื้อหา (ทั้งคู่จาก Cadson Demak)
const prompt = Prompt({ weight: ["500", "600", "700"], subsets: ["thai", "latin"], variable: "--font-prompt" });
const anuphan = Anuphan({ subsets: ["thai", "latin"], variable: "--font-anuphan" });

export default function SmePage() {
  return (
    <div className={`${prompt.variable} ${anuphan.variable} font-body`}>
      <SmeSimulator />
    </div>
  );
}

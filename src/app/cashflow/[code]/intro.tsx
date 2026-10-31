// คำอธิบายก่อนเริ่มเกม: host เปิดทีละหน้าบนจอใหญ่ มือถือทุกเครื่องแสดงหน้าเดียวกัน
// ขนาดทุกอย่างเป็นหน่วย em ของกล่องนอก จึงใช้ได้ทั้งจอใหญ่และมือถือ

import type { ReactNode } from "react";
import { FAST_GOAL, baht } from "@/lib/cashflow/data";

type Slide = { title: string; body: ReactNode };

function Point({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-[0.5em]">
      <span className="text-emerald-600">●</span>
      <span>{children}</span>
    </li>
  );
}

function Quadrant({ letter, name, line, right }: { letter: string; name: string; line: string; right: boolean }) {
  return (
    <div className={`rounded-[0.6em] p-[0.6em] ${right ? "bg-emerald-100 text-emerald-950" : "bg-stone-200 text-stone-800"}`}>
      <p className="flex items-baseline gap-[0.4em]">
        <span className="text-[2em] leading-none font-black">{letter}</span>
        <span className="font-bold">{name}</span>
      </p>
      <p className="mt-[0.3em] text-[0.8em] leading-snug">{line}</p>
    </div>
  );
}

export const INTRO_SLIDES: Slide[] = [
  {
    title: "เป้าหมายของเกม",
    body: (
      <div className="space-y-[0.8em]">
        <p className="text-[1.5em] leading-snug font-bold">
          ออกจาก <span className="text-rose-600">สนามแข่งหนู</span> ให้ได้
        </p>
        <ul className="space-y-[0.4em]">
          <Point>
            ทำให้ <b>รายได้จากทรัพย์สิน</b> (ค่าเช่า กำไรธุรกิจ) <b>มากกว่ารายจ่าย</b>ต่อเดือน
          </Point>
          <Point>ถึงตอนนั้น ต่อให้ไม่ทำงาน เงินก็ยังพอใช้ = อิสรภาพทางการเงิน</Point>
          <Point>
            ออกได้แล้วขึ้น <b>ทางด่วน</b> ใครซื้อความฝันของตัวเองได้ หรือเพิ่มรายได้ต่อรอบ {baht(FAST_GOAL)} ก่อน <b>ชนะ</b>
          </Point>
        </ul>
      </div>
    ),
  },
  {
    title: "สนามแข่งหนูคืออะไร",
    body: (
      <div className="space-y-[0.8em]">
        <div className="flex flex-wrap items-center justify-center gap-[0.4em] text-[1.1em] font-semibold">
          {["ทำงาน", "ได้เงินเดือน", "จ่ายบิล ผ่อนของ", "เงินหมด"].map((s) => (
            <span key={s} className="flex items-center gap-[0.4em]">
              <span className="rounded-full bg-rose-100 px-[0.7em] py-[0.2em] text-rose-900">{s}</span>
              <span className="text-stone-400">→</span>
            </span>
          ))}
          <span className="rounded-full bg-rose-600 px-[0.7em] py-[0.2em] text-white">กลับไปทำงาน 🔁</span>
        </div>
        <ul className="space-y-[0.4em]">
          <Point>วิ่งวนอยู่อย่างนี้ทุกเดือน เหมือนหนูแข่งกันวิ่งในสนามที่ไม่มีเส้นชัย</Point>
          <Point>ได้เงินเดือนขึ้น ก็มักใช้จ่ายมากขึ้นตาม เลยยังวนอยู่ที่เดิม</Point>
          <Point>ทางออก ไม่ใช่วิ่งให้เร็วขึ้น แต่คือ<b>สร้างรายได้ที่ไม่ต้องใช้แรงเราทำ</b></Point>
        </ul>
      </div>
    ),
  },
  {
    title: "ESBI: 4 ทางที่คนหาเงิน",
    body: (
      <div className="space-y-[0.6em]">
        <div className="grid grid-cols-2 gap-[0.5em]">
          <Quadrant letter="E" name="ลูกจ้าง" line="ทำงานให้คนอื่น ได้เงินเดือน" right={false} />
          <Quadrant letter="B" name="เจ้าของระบบธุรกิจ" line="มีระบบและทีมทำงานแทน ธุรกิจเดินได้แม้เราไม่อยู่" right />
          <Quadrant letter="S" name="ทำเอง" line="อาชีพอิสระ หรือเจ้าของกิจการที่ต้องลงมือเอง หยุดทำ = หยุดได้เงิน" right={false} />
          <Quadrant letter="I" name="นักลงทุน" line="ให้เงินทำงานแทน ผ่านทรัพย์สินที่สร้างรายได้" right />
        </div>
        <div className="grid grid-cols-2 gap-[0.5em] text-center text-[0.85em] font-semibold">
          <p className="text-stone-600">⬅ ฝั่งซ้าย: ใช้เวลาแลกเงิน</p>
          <p className="text-emerald-700">ฝั่งขวา: ระบบและเงินทำงานแทนเรา ➡</p>
        </div>
      </div>
    ),
  },
  {
    title: "ในเกมนี้: ย้ายจากซ้ายไปขวา",
    body: (
      <ul className="space-y-[0.5em] text-[1.05em]">
        <Point>
          ทุกคนเริ่มเป็น <b>E</b> มีเงินเดือนจากอาชีพที่สุ่มได้ และมีหนี้บ้าน รถ บัตรเครดิต
        </Point>
        <Point>
          ใช้เงินเก็บซื้อ <b>อสังหาฯ ให้เช่า ธุรกิจ หุ้น</b> = ค่อย ๆ ย้ายไปฝั่ง <b>B</b> และ <b>I</b>
        </Point>
        <Point>ทุกชิ้นที่ซื้อ ทำให้รายได้จากทรัพย์สินเพิ่มขึ้นทุกเดือน</Point>
        <Point>
          เมื่อรายได้จากทรัพย์สิน <b>มากกว่า</b>รายจ่าย = หลุดจากสนามแข่งหนู 🚀
        </Point>
      </ul>
    ),
  },
  {
    title: "ทรัพย์สิน vs หนี้สิน",
    body: (
      <div className="space-y-[0.6em]">
        <div className="grid grid-cols-2 gap-[0.5em]">
          <div className="rounded-[0.6em] bg-emerald-100 p-[0.6em] text-emerald-950">
            <p className="font-bold">ทรัพย์สิน</p>
            <p className="text-[0.85em]">เอาเงิน<b>เข้า</b>กระเป๋าทุกเดือน</p>
            <p className="mt-[0.3em] text-[0.8em]">เช่น คอนโดให้เช่า +฿2,000/เดือน</p>
          </div>
          <div className="rounded-[0.6em] bg-rose-100 p-[0.6em] text-rose-950">
            <p className="font-bold">หนี้สิน</p>
            <p className="text-[0.85em]">เอาเงิน<b>ออก</b>จากกระเป๋าทุกเดือน</p>
            <p className="mt-[0.3em] text-[0.8em]">เช่น ผ่อนรถ ผ่อนบัตรเครดิต</p>
          </div>
        </div>
        <ul className="space-y-[0.4em]">
          <Point>
            การ์ด <b>จ่ายซะ</b> = ของที่อยากได้ ซื้อแล้วเงินหาย ไม่ได้อะไรกลับมา
          </Point>
          <Point>ก่อนซื้ออะไร ถามตัวเองว่า &ldquo;มันเอาเงินเข้า หรือเอาเงินออก?&rdquo;</Point>
        </ul>
      </div>
    ),
  },
  {
    title: "วิธีเล่น",
    body: (
      <ul className="space-y-[0.4em]">
        <Point>ถึงตาแล้ว กดทอยลูกเต๋าบนมือถือ หนูเดินบนจอใหญ่</Point>
        <Point>
          <b>โอกาส</b>: เปิดดีลเล็ก/ดีลใหญ่ แล้วเลือกซื้อหรือไม่ซื้อ
        </Point>
        <Point>
          <b>เงินเดือน</b>: รับกระแสเงินสด · <b>ตลาด</b>: มีคนขอซื้อทรัพย์สิน · <b>จ่ายซะ</b>: ต้องจ่าย
        </Point>
        <Point>
          <b>ทำบุญ</b> ทอยได้ 2 ลูก · <b>มีลูก</b> รายจ่ายเพิ่ม · <b>ตกงาน</b> จ่ายและหยุดเดิน
        </Point>
        <Point>เงินไม่พอ กู้ธนาคารได้ แต่ต้องผ่อนเพิ่มทุกเดือน</Point>
        <Point>มือถือของคุณคือ <b>งบการเงิน</b> ดูหลอดอิสรภาพว่าใกล้หลุดแค่ไหน</Point>
      </ul>
    ),
  },
];

export function IntroSlide({ index, big = false }: { index: number; big?: boolean }) {
  const slide = INTRO_SLIDES[Math.min(index, INTRO_SLIDES.length - 1)];
  return (
    <div style={{ fontSize: big ? "clamp(18px, 2.2vw, 34px)" : "15px" }} className="text-stone-800">
      <p className="text-[0.7em] font-semibold tracking-wide text-stone-500">
        คำอธิบาย {Math.min(index, INTRO_SLIDES.length - 1) + 1}/{INTRO_SLIDES.length}
      </p>
      <h2 className="mb-[0.6em] text-[1.6em] leading-tight font-bold">{slide.title}</h2>
      {slide.body}
    </div>
  );
}

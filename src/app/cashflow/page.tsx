import type { Metadata } from "next";
import { Rat } from "./[code]/game-ui";
import { ROOMS_PER_IP_PER_HOUR } from "@/lib/data/cashflow";
import { createRoomAction } from "./actions";

export const metadata: Metadata = { title: "กระแสเงินสด" };

export default async function CashflowPage({ searchParams }: PageProps<"/cashflow">) {
  const { limit } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-6">
      <div className="flex justify-center gap-1">
        {["red", "orange", "yellow", "green", "blue", "purple"].map((c) => (
          <Rat key={c} color={c} className="w-12" />
        ))}
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-stone-900">กระแสเงินสด</h1>
        <p className="mt-2 text-stone-600">เกมฝึกคิดเรื่องเงิน ออกจากสนามแข่งหนูให้ได้ด้วยรายได้จากทรัพย์สิน</p>
      </div>
      <div className="card space-y-2 text-sm text-stone-700">
        <p>1. เปิดหน้านี้บนจอใหญ่ (ทีวี/โน้ตบุ๊ก) แล้วกดสร้างห้อง</p>
        <p>2. ผู้เล่น 2–6 คนสแกน QR ด้วยมือถือ ใส่ชื่อ เลือกสีหนู ไม่ต้องล็อกอิน</p>
        <p>3. กดเริ่มเกม แต่ละคนเล่นบนมือถือของตัวเอง กระดานและการ์ดขึ้นบนจอใหญ่</p>
        <p>4. ใครมีรายได้จากทรัพย์สินมากกว่ารายจ่ายก่อน ชนะ</p>
      </div>
      {limit && (
        <p className="rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-800">
          สร้างห้องได้ไม่เกิน {ROOMS_PER_IP_PER_HOUR} ห้องต่อชั่วโมง (หรือตอนนี้มีคนสร้างห้องเยอะมาก) ลองใหม่อีกสักพัก
        </p>
      )}
      <form action={createRoomAction}>
        <button className="btn-primary w-full text-lg">สร้างห้องใหม่</button>
      </form>
    </main>
  );
}

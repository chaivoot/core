import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { Rat } from "./[code]/game-ui";
import { createRoomAction } from "./actions";

export const metadata: Metadata = { title: "กระแสเงินสด" };

export default async function CashflowPage() {
  await requireUser();
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
      <form action={createRoomAction}>
        <button className="btn-primary w-full text-lg">สร้างห้องใหม่</button>
      </form>
    </main>
  );
}

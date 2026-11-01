import type { Metadata, Viewport } from "next";
import { Itim } from "next/font/google";
import { notFound } from "next/navigation";
import { getRoom } from "@/lib/data/cashflow";
import { PlayerScreen } from "./player";

// ตัวเลขในแผ่นงบการเงินเป็นลายมือ
const itim = Itim({ weight: "400", subsets: ["thai", "latin"], variable: "--font-itim" });

export const metadata: Metadata = { title: "กระแสเงินสด" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

// มือถือผู้เล่น: สแกน QR แล้วเข้าเล่นได้เลย ไม่ต้องล็อกอิน
export default async function PlayerPage({ params, searchParams }: PageProps<"/cashflow/[code]">) {
  const { code } = await params;
  // ?t= รหัสย้ายเครื่องจาก QR ที่ host สร้างให้
  const { t } = await searchParams;
  const room = await getRoom(code);
  if (!room) notFound();
  return (
    <div className={itim.variable}>
      <PlayerScreen code={room.code} claim={typeof t === "string" ? t : undefined} />
    </div>
  );
}

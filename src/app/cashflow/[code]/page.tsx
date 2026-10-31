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
export default async function PlayerPage({ params }: PageProps<"/cashflow/[code]">) {
  const { code } = await params;
  const room = await getRoom(code);
  if (!room) notFound();
  return (
    <div className={itim.variable}>
      <PlayerScreen code={room.code} />
    </div>
  );
}

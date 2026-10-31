import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { getRoom } from "@/lib/data/cashflow";
import { PlayerScreen } from "./player";

export const metadata: Metadata = { title: "กระแสเงินสด" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

// มือถือผู้เล่น: สแกน QR แล้วเข้าเล่นได้เลย ไม่ต้องล็อกอิน
export default async function PlayerPage({ params }: PageProps<"/cashflow/[code]">) {
  const { code } = await params;
  const room = await getRoom(code);
  if (!room) notFound();
  return <PlayerScreen code={room.code} />;
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getRoom } from "@/lib/data/cashflow";
import { requireUser } from "@/lib/session";
import { HostScreen } from "./host-screen";

export const metadata: Metadata = { title: "กระแสเงินสด · จอ host" };

export default async function HostPage({ params }: PageProps<"/cashflow/[code]/host">) {
  const user = await requireUser();
  const { code } = await params;
  const room = await getRoom(code);
  if (!room || room.hostId !== user.id) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "3s1m.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const joinUrl = `${proto}://${host}/cashflow/${room.code}`;
  const qrSvg = await QRCode.toString(joinUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  return <HostScreen code={room.code} joinUrl={joinUrl} qrSvg={qrSvg} />;
}

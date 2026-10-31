"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createRoom, HOST_COOKIE_MAX_AGE, hostCookie, RoomLimitError } from "@/lib/data/cashflow";

/** IP ของคนที่กด (Vercel ใส่ x-real-ip / x-forwarded-for ให้) */
async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

// เปิดให้ทุกคนสร้างห้องได้โดยไม่ต้องล็อกอิน: เครื่องที่สร้างห้องได้ cookie host ของห้องนั้น
export async function createRoomAction() {
  let room: { code: string; hostToken: string };
  try {
    room = await createRoom(await clientIp());
  } catch (e) {
    if (e instanceof RoomLimitError) redirect("/cashflow?limit=1");
    throw e;
  }
  const { code, hostToken } = room;
  (await cookies()).set(hostCookie(code), hostToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/cashflow/${code}`,
    maxAge: HOST_COOKIE_MAX_AGE,
  });
  redirect(`/cashflow/${code}/host`);
}

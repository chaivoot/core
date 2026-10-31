"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createRoom, HOST_COOKIE_MAX_AGE, hostCookie } from "@/lib/data/cashflow";

// เปิดให้ทุกคนสร้างห้องได้โดยไม่ต้องล็อกอิน: เครื่องที่สร้างห้องได้ cookie host ของห้องนั้น
export async function createRoomAction() {
  const { code, hostToken } = await createRoom();
  (await cookies()).set(hostCookie(code), hostToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/cashflow/${code}`,
    maxAge: HOST_COOKIE_MAX_AGE,
  });
  redirect(`/cashflow/${code}/host`);
}

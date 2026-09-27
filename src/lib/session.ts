import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = { id: string; name: string | null };

// อ่านจาก session (JWT) อย่างเดียว ไม่ต้อง query ฐานข้อมูลทุกหน้า
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return null;
  return { id: uid, name: session.user.name ?? null };
});

/** ใช้ในทุกหน้า/ทุก action ที่เข้าถึงข้อมูลผู้ใช้ */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

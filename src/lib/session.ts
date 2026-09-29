import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = { id: string; name: string | null; granted: boolean };

// อ่านจาก session (JWT) ไม่ต้อง query ฐานข้อมูลทุกหน้า (ยกเว้นคนที่ยังไม่ได้รับเชิญ)
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return null;
  return { id: uid, name: session.user.name ?? null, granted: session.user.granted === true };
});

/** ล็อกอินแล้ว (ยังไม่จำเป็นต้องได้รับเชิญ) - ใช้กับหน้ารับคำเชิญ */
export async function requireSignedIn() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** ใช้ในทุกหน้า/ทุก action ที่เข้าถึงข้อมูลผู้ใช้: ต้องล็อกอินและได้รับเชิญแล้ว */
export async function requireUser() {
  const user = await requireSignedIn();
  if (!user.granted) redirect("/no-access");
  return user;
}

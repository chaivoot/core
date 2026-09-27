import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserById } from "@/lib/data/users";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return null;
  return getUserById(uid);
});

/** ใช้ในทุกหน้า/ทุก action ที่เข้าถึงข้อมูลผู้ใช้ */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

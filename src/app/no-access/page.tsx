import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { CallButton } from "@/components/call-button";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "ยังไม่ได้รับเชิญ · 3S1M" };

export default async function NoAccessPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.granted) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-6 py-10">
      <h1 className="text-3xl font-bold text-stone-900">3S1M</h1>
      <p className="text-stone-700">
        ตอนนี้ระบบเปิดให้ใช้เฉพาะคนที่ได้รับลิงก์เชิญ ถ้าได้รับลิงก์จากคนในสายงาน กดลิงก์นั้นได้เลย
      </p>
      <p className="text-stone-600">สนใจทดสอบระบบ ติดต่อเราได้</p>
      <CallButton className="btn-primary w-full" />
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit" className="btn-ghost w-full">
          ออกจากระบบ
        </button>
      </form>
    </main>
  );
}

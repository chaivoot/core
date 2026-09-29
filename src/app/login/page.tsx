import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getCurrentUser } from "@/lib/session";
import { CallButton } from "@/components/call-button";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "เข้าสู่ระบบ · 3S1M" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  // กลับไปหน้าที่ตั้งใจจะเข้า (เช่น ลิงก์เชิญ) เฉพาะ path ภายในเว็บนี้
  const target =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getCurrentUser()) redirect(target);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-bold text-stone-900">3S1M</h1>
      <p className="mt-3 text-stone-600">
        ทบทวนตัวเองรายสัปดาห์ และจดรายชื่อที่อยู่ในหัวออกมาให้เป็นจริง
      </p>

      {error && (
        <p className="mt-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้งนะ
          <span className="mt-1 block text-xs text-amber-700/80">รหัส: {String(error)}</span>
        </p>
      )}

      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signIn("line", { redirectTo: target });
        }}
      >
        <SubmitButton
          className="btn w-full bg-[#06C755] text-white hover:bg-[#05b34c]"
          pendingText="กำลังไปที่ LINE…"
        >
          เข้าสู่ระบบด้วย LINE
        </SubmitButton>
      </form>

      <div className="mt-8 border-t border-stone-200 pt-6">
        <p className="mb-3 text-sm text-stone-600">สนใจทดสอบระบบ</p>
        <CallButton />
      </div>

      <p className="mt-6 text-xs text-stone-500">
        ข้อมูลของคุณ (คะแนนและรายชื่อ) เห็นได้เฉพาะคุณคนเดียว
      </p>
    </main>
  );
}

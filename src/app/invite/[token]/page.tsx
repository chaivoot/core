import Link from "next/link";
import { redirect } from "next/navigation";
import { redeemAccessInviteAction } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { getOpenAccessInvite } from "@/lib/data/access";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "คำเชิญ · 3S1M" };

export default async function AccessInvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  if (user.granted) redirect("/");

  const invite = await getOpenAccessInvite(token);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-6 py-10">
      <h1 className="text-3xl font-bold text-stone-900">3S1M</h1>
      {invite ? (
        <>
          <p className="text-stone-700">
            <strong>{invite.inviterName ?? "คนในสายงาน"}</strong> ชวนคุณมาใช้ 3S1M
            ทบทวนตัวเองรายสัปดาห์ จดรายชื่อ และดูผังสายงาน
          </p>
          <p className="text-sm text-stone-500">ข้อมูลของคุณเห็นได้เฉพาะคุณคนเดียว</p>
          <form action={redeemAccessInviteAction.bind(null, token)}>
            <SubmitButton className="btn-primary w-full">เริ่มใช้ 3S1M</SubmitButton>
          </form>
        </>
      ) : (
        <>
          <p className="rounded-xl bg-amber-50 p-3 text-amber-800">
            ลิงก์นี้ใช้ไม่ได้แล้ว (ถูกใช้ไปแล้ว หรือหมดอายุ) ขอลิงก์ใหม่จากคนที่ชวนได้เลย
          </p>
          <Link href="/no-access" className="btn-ghost w-full">
            กลับ
          </Link>
        </>
      )}
    </main>
  );
}

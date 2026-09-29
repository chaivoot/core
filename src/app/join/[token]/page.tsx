import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptInviteAction } from "@/app/(app)/team/actions";
import { SubmitButton } from "@/components/submit-button";
import { getOpenInvite, getTeamContext } from "@/lib/data/partner";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "ใช้ผังสายงานร่วมกัน · Core" };

const ERRORS: Record<string, string> = {
  invalid: "ลิงก์นี้ใช้ไม่ได้แล้ว (ถูกใช้ไปแล้ว หรือหมดอายุ) ขอลิงก์ใหม่จากคู่ได้เลย",
  self: "นี่คือลิงก์ที่คุณสร้างเอง ส่งให้คู่เปิดด้วย LINE ของเขานะ",
  inviter_busy: "คนเชิญใช้ผังร่วมกับคนอื่นอยู่แล้ว",
  you_busy: "คุณใช้ผังร่วมกับคนอื่นอยู่แล้ว ต้องเลิกใช้ผังร่วมเดิมก่อน (ที่หน้าสายงาน)",
};

export default async function JoinPage({ params, searchParams }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const { e } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);

  const [invite, ctx] = await Promise.all([getOpenInvite(token), getTeamContext(user.id)]);
  const error =
    typeof e === "string"
      ? ERRORS[e]
      : !invite
        ? ERRORS.invalid
        : invite.inviterId === user.id
          ? ERRORS.self
          : ctx.role !== "solo"
            ? ERRORS.you_busy
            : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-6 py-10">
      <h1 className="text-2xl font-bold text-stone-900">ใช้ผังสายงานร่วมกัน</h1>

      {error || !invite ? (
        <p className="rounded-xl bg-amber-50 p-3 text-amber-800">{error ?? ERRORS.invalid}</p>
      ) : (
        <>
          <p className="text-stone-700">
            <strong>{invite.inviterName ?? "คู่ของคุณ"}</strong> ชวนคุณมาใช้ผังสายงานร่วมกัน
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
            <li>คุณจะเห็นและแก้ไขผังสายงานเดียวกันกับ {invite.inviterName ?? "คู่"}</li>
            <li>คะแนนรายสัปดาห์ รายชื่อ และสรุปเดือน ยังแยกเป็นของแต่ละคน</li>
            <li>ผังสายงานเดิมของคุณ (ถ้ามี) จะถูกซ่อนไว้ ไม่ลบ กลับมาได้ถ้าเลิกใช้ผังร่วม</li>
          </ul>
          <form action={acceptInviteAction.bind(null, token)}>
            <SubmitButton className="btn-primary w-full">ยืนยัน ใช้ผังร่วมกัน</SubmitButton>
          </form>
        </>
      )}

      <Link href="/team" className="btn-ghost w-full">
        ไปหน้าสายงาน
      </Link>
    </main>
  );
}

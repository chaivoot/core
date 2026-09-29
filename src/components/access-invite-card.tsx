import { headers } from "next/headers";
import { createAccessInviteAction } from "@/app/invite/actions";
import { SubmitButton } from "@/components/submit-button";
import { getOpenAccessInvite } from "@/lib/data/access";

/** ชวนคนใหม่มาใช้ระบบ: สร้างลิงก์เชิญ (ใช้ได้ 1 คน ภายใน 7 วัน) */
export async function AccessInviteCard({ userId, token }: { userId: string; token?: string }) {
  const invite = token ? await getOpenAccessInvite(token) : null;
  let url: string | null = null;
  if (invite && invite.inviterId === userId) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    url = `${proto}://${host}/invite/${invite.token}`;
  }

  return (
    <section id="invite" className="card scroll-mt-4 space-y-3">
      <h2 className="font-semibold text-stone-900">ชวนคนในสายงานมาใช้ 3S1M</h2>
      <p className="text-sm text-stone-600">
        ระบบเปิดให้ใช้เฉพาะคนที่ได้รับเชิญ 1 ลิงก์ใช้ได้ 1 คน ภายใน 7 วัน
      </p>
      {url ? (
        <div className="space-y-2">
          <input readOnly value={url} className="input text-sm" aria-label="ลิงก์เชิญ" />
          <a
            href={`https://line.me/R/share?text=${encodeURIComponent(`มาลองใช้ 3S1M กัน ${url}`)}`}
            className="btn w-full bg-[#06C755] text-white hover:bg-[#05b34c]"
          >
            ส่งทาง LINE
          </a>
          <form action={createAccessInviteAction}>
            <SubmitButton className="btn-ghost w-full">สร้างลิงก์ใหม่อีกอัน</SubmitButton>
          </form>
        </div>
      ) : (
        <form action={createAccessInviteAction}>
          <SubmitButton className="btn-secondary w-full">สร้างลิงก์เชิญ</SubmitButton>
        </form>
      )}
    </section>
  );
}

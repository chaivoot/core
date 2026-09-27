import Link from "next/link";
import { signOut } from "@/auth";
import { QuickAddContact } from "@/components/quick-add-contact";
import { countContactsAdded } from "@/lib/data/contacts";
import { getReviews, isReviewComplete, reviewTotal } from "@/lib/data/reviews";
import {
  MONTHLY_NEW_CONTACT_GOAL,
  addDays,
  canEditWeek,
  formatMonth,
  formatWeek,
  monthDateRange,
  monthOfDate,
  today,
  weekStartOf,
} from "@/lib/dates";
import { requireUser } from "@/lib/session";

export default async function HomePage() {
  const user = await requireUser();
  const now = today();
  const currentWeek = weekStartOf(now);

  // สัปดาห์ปัจจุบัน + สัปดาห์ก่อนหน้าที่ยังแก้ไขได้
  const weeks: string[] = [];
  for (let w = currentWeek; canEditWeek(w, now); w = addDays(w, -7)) weeks.push(w);

  const reviews = await getReviews(user.id, weeks);
  const byWeek = new Map(reviews.map((r) => [r.weekStart, r]));

  const month = monthOfDate(now);
  const range = monthDateRange(month);
  const newContacts = await countContactsAdded(user.id, range.from, now < range.to ? now : range.to);
  const progress = Math.min(newContacts / MONTHLY_NEW_CONTACT_GOAL, 1);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">สวัสดี</p>
          <h1 className="text-2xl font-bold text-stone-900">{user.name ?? "คุณ"}</h1>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="btn-ghost min-h-9 px-2 text-sm">
            ออกจากระบบ
          </button>
        </form>
      </header>

      <section className="space-y-2">
        <h2 className="font-semibold text-stone-900">ทบทวนรายสัปดาห์</h2>
        <ul className="space-y-2">
          {weeks.map((w) => {
            const review = byWeek.get(w);
            const complete = isReviewComplete(review);
            const started = !!review;
            return (
              <li key={w}>
                <Link
                  href={complete ? `/review/${w}/summary` : `/review/${w}/1`}
                  className="card flex items-center justify-between gap-3 hover:bg-stone-50"
                >
                  <div>
                    <div className="text-xs text-stone-500">
                      {w === currentWeek
                        ? "สัปดาห์นี้"
                        : w === addDays(currentWeek, -7)
                          ? "สัปดาห์ที่แล้ว"
                          : "ย้อนหลัง"}
                    </div>
                    <div className="font-medium text-stone-900">{formatWeek(w)}</div>
                  </div>
                  {complete ? (
                    <span className="text-lg font-semibold text-stone-900">
                      {reviewTotal(review)}
                      <span className="text-sm font-normal text-stone-400">/40</span>
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
                      {started ? "ทำต่อ" : "เริ่มทบทวน"}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <QuickAddContact />

      <Link href="/summary" className="card block hover:bg-stone-50">
        <div className="flex items-baseline justify-between">
          <span className="text-stone-700">รายชื่อใหม่{formatMonth(month)}</span>
          <span className="font-semibold text-stone-900">
            {newContacts}/{MONTHLY_NEW_CONTACT_GOAL}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-teal-600" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-2 text-sm text-teal-700">ดูสรุปเดือนนี้ →</div>
      </Link>
    </div>
  );
}

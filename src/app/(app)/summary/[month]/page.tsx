import Link from "next/link";
import { notFound } from "next/navigation";
import { countContactsAdded } from "@/lib/data/contacts";
import { getReviews } from "@/lib/data/reviews";
import { getUserById } from "@/lib/data/users";
import {
  MONTHLY_NEW_CONTACT_GOAL,
  canEditWeek,
  formatMonth,
  formatWeek,
  isValidMonth,
  monthDateRange,
  monthOfDate,
  shiftMonth,
  today,
  weeksOfMonth,
} from "@/lib/dates";
import { CATEGORIES } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { summarizeMonth, type WeekStatus } from "@/lib/summary";

const STATUS_TEXT: Record<Exclude<WeekStatus, "filled">, string> = {
  missing: "ไม่ได้กรอก (นับเป็น 0)",
  in_progress: "สัปดาห์นี้ยังไม่ได้กรอก",
  future: "ยังไม่ถึง",
  before_start: "ก่อนเริ่มใช้งาน",
};

function fmt(n: number | null, digits = 1) {
  if (n === null) return "–";
  return n.toLocaleString("th-TH", { maximumFractionDigits: digits });
}

export default async function MonthSummaryPage({ params }: PageProps<"/summary/[month]">) {
  const user = await requireUser();
  const { month } = await params;
  if (!isValidMonth(month)) notFound();

  const now = today();
  const currentMonth = monthOfDate(now);
  const range = monthDateRange(month);
  const [reviews, newContacts, profile] = await Promise.all([
    getReviews(user.id, weeksOfMonth(month)),
    countContactsAdded(user.id, range.from, range.to),
    getUserById(user.id),
  ]);
  const summary = summarizeMonth({
    month,
    today: now,
    userCreatedAt: profile?.createdAt ?? new Date(),
    reviews,
  });
  const progress = Math.min(newContacts / MONTHLY_NEW_CONTACT_GOAL, 1);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-2">
        <Link href={`/summary/${shiftMonth(month, -1)}`} className="btn-ghost px-3" aria-label="เดือนก่อน">
          ←
        </Link>
        <h1 className="text-xl font-bold text-stone-900">{formatMonth(month)}</h1>
        {month < currentMonth ? (
          <Link href={`/summary/${shiftMonth(month, 1)}`} className="btn-ghost px-3" aria-label="เดือนถัดไป">
            →
          </Link>
        ) : (
          <span className="w-11" />
        )}
      </header>

      <section className="card text-center">
        <p className="text-stone-500">คะแนนเฉลี่ยรายสัปดาห์</p>
        <p className="mt-1 text-5xl font-bold text-stone-900">
          {fmt(summary.average)}
          <span className="text-2xl font-medium text-stone-400">/40</span>
        </p>
        <p className="mt-2 text-sm text-stone-500">
          {summary.countedWeeks === 0
            ? "ยังไม่มีสัปดาห์ที่นับในเดือนนี้"
            : `กรอกแล้ว ${summary.filledWeeks} จาก ${summary.countedWeeks} สัปดาห์`}
        </p>
      </section>

      <section className="card">
        <div className="flex items-baseline justify-between">
          <span className="text-stone-700">รายชื่อใหม่</span>
          <span className="font-semibold text-stone-900">
            {newContacts}/{MONTHLY_NEW_CONTACT_GOAL}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-teal-600" style={{ width: `${progress * 100}%` }} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-stone-900">เฉลี่ยรายหมวด</h2>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="card p-3">
              <div className="text-sm text-stone-600">{c.title}</div>
              <div className="text-xl font-semibold text-stone-900">
                {fmt(summary.categoryAverages[c.key])}
                <span className="text-sm font-normal text-stone-400">/10</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-stone-900">รายสัปดาห์</h2>
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
          {summary.weeks.map((w) => {
            const clickable = w.status === "filled" || canEditWeek(w.weekStart, now);
            const content = (
              <>
                <span className="text-stone-700">{formatWeek(w.weekStart)}</span>
                {w.status === "filled" ? (
                  <span className="shrink-0 font-semibold text-stone-900">
                    {w.total}
                    <span className="font-normal text-stone-400">/40</span>
                  </span>
                ) : (
                  <span className="shrink-0 text-right text-sm text-stone-400">{STATUS_TEXT[w.status]}</span>
                )}
              </>
            );
            return (
              <li key={w.weekStart}>
                {clickable ? (
                  <Link
                    href={`/review/${w.weekStart}/${w.status === "filled" ? "summary" : "1"}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-4 py-3">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <Link href={`/report?month=${month}`} className="btn-secondary w-full">
        พิมพ์รายงาน / บันทึก PDF
      </Link>
    </div>
  );
}

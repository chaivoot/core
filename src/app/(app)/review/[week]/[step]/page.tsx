import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { saveStepAction } from "../../actions";
import { ScoreInput } from "@/components/score-input";
import { SubmitButton } from "@/components/submit-button";
import { ToggleChip } from "@/components/toggle-chip";
import { getActionStats, getReview, reviewTotal } from "@/lib/data/reviews";
import type { WeeklyReview } from "@/lib/db/schema";
import {
  EDIT_WINDOW_DAYS,
  MONTHLY_NEW_CONTACT_GOAL,
  canEditWeek,
  formatMonth,
  formatWeek,
  isWeekStart,
  monthOfWeek,
  today,
} from "@/lib/dates";
import { ACTIVITY_LABELS, ACTIVITY_TYPES, CATEGORIES, LEARNING_ITEMS } from "@/lib/labels";
import { requireUser } from "@/lib/session";

export default async function ReviewStepPage({
  params,
  searchParams,
}: PageProps<"/review/[week]/[step]">) {
  const user = await requireUser();
  const { week, step: stepParam } = await params;
  const sp = await searchParams;

  if (!isWeekStart(week)) notFound();
  if (week > today()) redirect("/");

  const [review, stats] = await Promise.all([
    getReview(user.id, week),
    stepParam === "4" ? getActionStats(user.id, week) : null,
  ]);
  const editable = canEditWeek(week);

  if (stepParam === "summary") {
    return <ReviewSummary week={week} review={review} editable={editable} />;
  }

  const step = Number(stepParam);
  const category = CATEGORIES.find((c) => c.step === step);
  if (!category) notFound();

  const action = saveStepAction.bind(null, week, step);
  const backHref = step === 1 ? "/" : `/review/${week}/${step - 1}`;
  const nextHref = step < 4 ? `/review/${week}/${step + 1}` : `/review/${week}/summary`;

  return (
    <div className="space-y-5">
      <ReviewHeader week={week} step={step} />

      {!editable && <ReadOnlyNote />}
      {sp.e === "invalid" && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          เลือกคะแนนหมวดนี้ (0-10) ก่อนไปต่อนะ
        </p>
      )}

      <form action={action} className="space-y-5">
        <fieldset disabled={!editable} className="space-y-5">
          <section className="card space-y-4">
            <h2 className="text-lg font-semibold text-stone-900">
              หมวด {step}: {category.title}
            </h2>
            {step === 1 && <PriorityStep review={review} />}
            {step === 2 && <ProductsStep review={review} />}
            {step === 3 && <LearningStep review={review} />}
            {step === 4 && stats && <ActionStep stats={stats} week={week} review={review} />}
          </section>

          <section className="card space-y-3">
            <h2 className="font-semibold text-stone-900">ให้คะแนนหมวดนี้ด้วยตัวเอง</h2>
            <p className="text-sm text-stone-500">
              0 - 10 คะแนน ตามที่คุณรู้สึกกับตัวเองในสัปดาห์นี้
            </p>
            <ScoreInput defaultValue={review?.[category.key] ?? null} />
          </section>
        </fieldset>

        <div className="flex gap-2">
          <Link href={backHref} className="btn-secondary flex-1">
            ย้อนกลับ
          </Link>
          {editable ? (
            <SubmitButton className="btn-primary flex-[2]">
              {step < 4 ? "บันทึก และไปหมวดถัดไป" : "บันทึก และดูสรุป"}
            </SubmitButton>
          ) : (
            <Link href={nextHref} className="btn-primary flex-[2]">
              {step < 4 ? "หมวดถัดไป" : "ดูสรุป"}
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}

function ReviewHeader({ week, step }: { week: string; step: number | "summary" }) {
  return (
    <header className="space-y-3">
      <div>
        <p className="text-sm text-stone-500">ทบทวนสัปดาห์</p>
        <h1 className="text-xl font-bold text-stone-900">{formatWeek(week)}</h1>
      </div>
      <ol className="flex gap-1.5" aria-label="ขั้นตอน">
        {CATEGORIES.map((c) => {
          const active = step === "summary" || c.step <= step;
          return (
            <li key={c.step} className="flex-1">
              <Link
                href={`/review/${week}/${c.step}`}
                className={`block h-1.5 rounded-full ${active ? "bg-teal-600" : "bg-stone-200"}`}
                aria-label={`หมวด ${c.step} ${c.title}`}
                aria-current={step === c.step ? "step" : undefined}
              />
            </li>
          );
        })}
      </ol>
    </header>
  );
}

function ReadOnlyNote() {
  return (
    <p className="rounded-xl bg-stone-100 p-3 text-sm text-stone-600">
      สัปดาห์นี้ดูย้อนหลังได้อย่างเดียว (แก้ไขได้ภายใน {EDIT_WINDOW_DAYS} วันหลังจบสัปดาห์)
    </p>
  );
}

function PriorityStep({ review }: { review: WeeklyReview | null }) {
  return (
    <div className="space-y-3">
      <p className="text-stone-700">
        ช่วงสัปดาห์ที่ผ่านมา คุณให้แอมเวย์อยู่ใน<strong>ลำดับความสำคัญ</strong>ที่เท่าไหร่
      </p>
      <p className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">
        เป็น<strong>อันดับ</strong> ไม่ใช่ระดับคะแนน — <strong>1 = สำคัญที่สุด</strong>
      </p>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((n) => (
          <ToggleChip
            key={n}
            type="radio"
            name="rank"
            value={String(n)}
            defaultChecked={review?.priorityRank === n}
          >
            อันดับ {n}
            {n === 1 ? " (สำคัญที่สุด)" : ""}
          </ToggleChip>
        ))}
      </div>
    </div>
  );
}

function ProductsStep({ review }: { review: WeeklyReview | null }) {
  return (
    <div className="space-y-3">
      <p className="text-stone-700">สัปดาห์นี้คุณใช้สินค้า 5 - 20 ตัวไหม</p>
      <ToggleChip name="productsUsed" defaultChecked={review?.productsUsed}>
        ใช้สินค้า 5 - 20 ตัว
      </ToggleChip>
    </div>
  );
}

function LearningStep({ review }: { review: WeeklyReview | null }) {
  return (
    <div className="space-y-4">
      <p className="text-stone-700">ในรอบสัปดาห์ที่ผ่านมา คุณ…</p>
      {LEARNING_ITEMS.map((item) => (
        <div key={item.key} className="space-y-2">
          <ToggleChip name={item.key} defaultChecked={review?.[item.key]}>
            {item.label}
          </ToggleChip>
          <input
            name={item.detailKey}
            defaultValue={review?.[item.detailKey] ?? ""}
            placeholder={`${item.placeholder} (ไม่บังคับ)`}
            maxLength={1000}
            className="input"
            aria-label={`รายละเอียด ${item.label}`}
          />
        </div>
      ))}
    </div>
  );
}

function ActionStep({
  stats,
  week,
  review,
}: {
  stats: Awaited<ReturnType<typeof getActionStats>>;
  week: string;
  review: WeeklyReview | null;
}) {
  const month = monthOfWeek(week);
  const progress = Math.min(stats.newContactsMonthToDate / MONTHLY_NEW_CONTACT_GOAL, 1);

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">ข้อมูลจากระบบรายชื่อในสัปดาห์นี้ ไว้ช่วยทบทวน</p>

      <div className="rounded-xl bg-stone-50 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-stone-700">รายชื่อใหม่สัปดาห์นี้</span>
          <span className="text-xl font-semibold text-stone-900">{stats.newContactsThisWeek}</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between text-sm">
          <span className="text-stone-600">สะสม{formatMonth(month)}</span>
          <span className="font-medium text-stone-800">
            {stats.newContactsMonthToDate}/{MONTHLY_NEW_CONTACT_GOAL}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-teal-600" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ACTIVITY_TYPES.map((t) => (
          <div key={t} className="rounded-xl bg-stone-50 p-3">
            <div className="text-sm text-stone-600">{ACTIVITY_LABELS[t]}</div>
            <div className="text-xl font-semibold text-stone-900">{stats.activityCounts[t]}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <ToggleChip name="teamWork" defaultChecked={review?.teamWork}>
          ทำงานร่วมกับสายงาน
        </ToggleChip>
        <input
          name="teamWorkDetail"
          defaultValue={review?.teamWorkDetail ?? ""}
          placeholder="รายละเอียด (ไม่บังคับ)"
          maxLength={1000}
          className="input"
          aria-label="รายละเอียด ทำงานร่วมกับสายงาน"
        />
      </div>
    </div>
  );
}

function ReviewSummary({
  week,
  review,
  editable,
}: {
  week: string;
  review: WeeklyReview | null;
  editable: boolean;
}) {
  const total = reviewTotal(review);
  const missing = CATEGORIES.filter((c) => review?.[c.key] == null);

  return (
    <div className="space-y-5">
      <ReviewHeader week={week} step="summary" />
      {!editable && <ReadOnlyNote />}

      <section className="card text-center">
        <p className="text-stone-500">คะแนนรวมสัปดาห์นี้</p>
        <p className="mt-1 text-5xl font-bold text-stone-900">
          {total}
          <span className="text-2xl font-medium text-stone-400">/40</span>
        </p>
        {missing.length === 0 && (
          <p className="mt-3 text-sm text-stone-600">ขอบคุณที่สละเวลาทบทวนตัวเองในสัปดาห์นี้</p>
        )}
      </section>

      <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
        {CATEGORIES.map((c) => (
          <li key={c.step}>
            <Link
              href={`/review/${week}/${c.step}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-stone-50"
            >
              <span className="text-stone-700">
                {c.step}. {c.title}
              </span>
              <span className="font-semibold text-stone-900">
                {review?.[c.key] ?? <span className="font-normal text-stone-400">ยังไม่ได้ให้คะแนน</span>}
                {review?.[c.key] != null && <span className="font-normal text-stone-400">/10</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {editable && missing.length > 0 && (
        <Link href={`/review/${week}/${missing[0].step}`} className="btn-primary w-full">
          ทำหมวด {missing[0].step} ต่อ
        </Link>
      )}
      <Link href="/" className="btn-secondary w-full">
        กลับหน้าหลัก
      </Link>
    </div>
  );
}

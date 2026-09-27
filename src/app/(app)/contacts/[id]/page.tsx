import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addActivityAction,
  deleteActivityAction,
  deleteContactAction,
  updateActivityAction,
  updateContactAction,
} from "../actions";
import { ConfirmSubmitButton } from "@/components/confirm-button";
import { InterestBadge } from "@/components/interest-badge";
import { SubmitButton } from "@/components/submit-button";
import { ToggleChip } from "@/components/toggle-chip";
import { getContact, listActivities } from "@/lib/data/contacts";
import type { Activity, ActivityType } from "@/lib/db/schema";
import {
  EDIT_WINDOW_DAYS,
  addDays,
  canEditActivityDate,
  formatDate,
  today,
} from "@/lib/dates";
import { ACTIVITY_LABELS, ACTIVITY_TYPES } from "@/lib/labels";
import { requireUser } from "@/lib/session";

const MESSAGES: Record<string, string> = {
  invalid: "ข้อมูลไม่ครบหรือไม่ถูกต้อง ลองตรวจอีกครั้ง",
  too_old: `แก้ไขกิจกรรมได้เฉพาะวันที่ไม่เกิน ${EDIT_WINDOW_DAYS} วันย้อนหลัง`,
  saved: "บันทึกแล้ว",
  activity: "บันทึกกิจกรรมแล้ว",
};

export default async function ContactPage({ params, searchParams }: PageProps<"/contacts/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  // listActivities กรองด้วย userId อยู่แล้ว จึงดึงพร้อมกันได้
  const [contact, activities] = await Promise.all([
    getContact(user.id, id),
    listActivities(user.id, id),
  ]);
  if (!contact) notFound();
  const now = today();
  const minDate = addDays(now, -EDIT_WINDOW_DAYS);
  const error = typeof sp.e === "string" ? MESSAGES[sp.e] : undefined;
  const ok = typeof sp.ok === "string" ? MESSAGES[sp.ok] : undefined;

  return (
    <div className="space-y-4">
      <Link href="/contacts" className="text-sm text-stone-500">
        ← รายชื่อทั้งหมด
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold break-words text-stone-900">{contact.name}</h1>
          <InterestBadge interest={contact.interest} />
        </div>
        {contact.channel && <p className="mt-1 text-stone-600">{contact.channel}</p>}
        {contact.note && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-stone-600">{contact.note}</p>
        )}
        <p className="mt-2 text-xs text-stone-400">เพิ่มเมื่อ {formatDate(contact.addedOn)}</p>
      </header>

      {error && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
      {ok && !error && <p className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{ok}</p>}

      <details className="card">
        <summary className="cursor-pointer font-medium text-stone-700 select-none">
          แก้ไขข้อมูล
        </summary>
        <form action={updateContactAction.bind(null, contact.id)} className="mt-4 space-y-3">
          <div>
            <label className="label" htmlFor="name">ชื่อ</label>
            <input id="name" name="name" required maxLength={200} defaultValue={contact.name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="channel">ช่องทางติดต่อ</label>
            <input id="channel" name="channel" maxLength={300} defaultValue={contact.channel ?? ""} className="input" />
          </div>
          <div>
            <span className="label">ความสนใจตอนนี้</span>
            <div className="flex flex-wrap gap-2">
              <ToggleChip type="radio" name="interest" value="" defaultChecked={!contact.interest}>
                ยังไม่ระบุ
              </ToggleChip>
              <ToggleChip type="radio" name="interest" value="product" defaultChecked={contact.interest === "product"}>
                สินค้า
              </ToggleChip>
              <ToggleChip type="radio" name="interest" value="business" defaultChecked={contact.interest === "business"}>
                ธุรกิจ
              </ToggleChip>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="note">โน้ต</label>
            <textarea id="note" name="note" rows={3} maxLength={5000} defaultValue={contact.note ?? ""} className="input" />
          </div>
          <SubmitButton className="btn-primary w-full">บันทึก</SubmitButton>
        </form>
      </details>

      <section className="card space-y-3">
        <h2 className="font-semibold text-stone-900">บันทึกกิจกรรม</h2>
        <ActivityForm
          action={addActivityAction.bind(null, contact.id)}
          minDate={minDate}
          defaults={{ type: null, date: now, note: null }}
          submitLabel="บันทึกกิจกรรม"
        />
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-stone-900">ไทม์ไลน์</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มีกิจกรรม</p>
        ) : (
          <ol className="relative space-y-3 border-l-2 border-stone-200 pl-4">
            {activities.map((a) => (
              <TimelineItem key={a.id} activity={a} editable={canEditActivityDate(a.date, now)} minDate={minDate} />
            ))}
          </ol>
        )}
      </section>

      <form action={deleteContactAction.bind(null, contact.id)} className="pt-6">
        <ConfirmSubmitButton
          message={`ลบ "${contact.name}" และกิจกรรมทั้งหมดของรายชื่อนี้? ลบแล้วกู้คืนไม่ได้`}
          className="btn-danger w-full"
        >
          ลบรายชื่อนี้
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

function TimelineItem({
  activity,
  editable,
  minDate,
}: {
  activity: Activity;
  editable: boolean;
  minDate: string;
}) {
  return (
    <li className="relative">
      <span className="absolute top-2 -left-[23px] h-3 w-3 rounded-full border-2 border-white bg-teal-600" />
      <div className="card p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-stone-900">{ACTIVITY_LABELS[activity.type]}</span>
          <span className="shrink-0 text-sm text-stone-500">{formatDate(activity.date)}</span>
        </div>
        {activity.note && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{activity.note}</p>
        )}
        {editable && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-stone-500 select-none">แก้ไข</summary>
            <div className="mt-3 space-y-3">
              <ActivityForm
                action={updateActivityAction.bind(null, activity.id)}
                minDate={minDate}
                defaults={activity}
                submitLabel="บันทึก"
                idPrefix={activity.id}
              />
              <form action={deleteActivityAction.bind(null, activity.id)}>
                <ConfirmSubmitButton message="ลบกิจกรรมนี้?" className="btn-danger w-full">
                  ลบกิจกรรม
                </ConfirmSubmitButton>
              </form>
            </div>
          </details>
        )}
      </div>
    </li>
  );
}

function ActivityForm({
  action,
  minDate,
  defaults,
  submitLabel,
  idPrefix = "new",
}: {
  action: (formData: FormData) => Promise<void>;
  minDate: string;
  defaults: { type: ActivityType | null; date: string; note: string | null };
  submitLabel: string;
  idPrefix?: string;
}) {
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_TYPES.map((t) => (
          <ToggleChip key={t} type="radio" name="type" value={t} defaultChecked={defaults.type === t} required>
            {ACTIVITY_LABELS[t]}
          </ToggleChip>
        ))}
      </div>
      <div>
        <label className="label" htmlFor={`${idPrefix}-date`}>วันที่</label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          name="date"
          required
          min={minDate}
          defaultValue={defaults.date}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor={`${idPrefix}-note`}>โน้ต (ไม่บังคับ)</label>
        <textarea id={`${idPrefix}-note`} name="note" rows={2} maxLength={5000} defaultValue={defaults.note ?? ""} className="input" />
      </div>
      <SubmitButton className="btn-primary w-full">{submitLabel}</SubmitButton>
    </form>
  );
}

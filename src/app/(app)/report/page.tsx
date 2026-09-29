import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { StatusDot, TeamChart } from "@/components/team-chart";
import { countActivitiesByType, countContactsAdded, listContacts } from "@/lib/data/contacts";
import { getReviews } from "@/lib/data/reviews";
import { listTeamMembers } from "@/lib/data/team";
import { getUserById } from "@/lib/data/users";
import type { TeamMember, WeeklyReview } from "@/lib/db/schema";
import {
  MONTHLY_NEW_CONTACT_GOAL,
  formatDate,
  formatMonth,
  formatWeek,
  isValidMonth,
  monthDateRange,
  monthOfDate,
  shiftMonth,
  today,
  weeksOfMonth,
} from "@/lib/dates";
import {
  ACTIVITY_LABELS,
  ACTIVITY_TYPES,
  CATEGORIES,
  INTEREST_LABELS,
  LEARNING_ITEMS,
  TEAM_STATUSES,
  TEAM_STATUS_LABELS,
} from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { summarizeMonth, type WeekStatus } from "@/lib/summary";
import { buildTeamTree, layoutChart, walk, type TeamNode } from "@/lib/team";

export const metadata = { title: "รายงานสำหรับพิมพ์ · Core" };

const WEEK_STATUS_TEXT: Record<Exclude<WeekStatus, "filled">, string> = {
  missing: "ไม่ได้กรอก (นับเป็น 0)",
  in_progress: "ยังไม่ได้กรอก",
  future: "ยังไม่ถึง",
  before_start: "ก่อนเริ่มใช้งาน",
};

function fmt(n: number | null) {
  return n === null ? "–" : n.toLocaleString("th-TH", { maximumFractionDigits: 1 });
}

export default async function ReportPage({ searchParams }: PageProps<"/report">) {
  const user = await requireUser();
  const sp = await searchParams;
  const now = today();
  const currentMonth = monthOfDate(now);
  const month =
    typeof sp.month === "string" && isValidMonth(sp.month) && sp.month <= currentMonth
      ? sp.month
      : currentMonth;

  // ส่งฟอร์มแล้วใช้ค่าที่ติ๊ก ถ้ายังไม่เคยส่งใช้ค่าเริ่มต้น (รายชื่อคนปิดไว้ เพราะเป็นข้อมูลบุคคลที่สาม)
  const submitted = sp.s === "1";
  const show = {
    weeks: submitted ? sp.weeks === "1" : true,
    team: submitted ? sp.team === "1" : true,
    contacts: submitted ? sp.contacts === "1" : false,
  };

  const range = monthDateRange(month);
  const [profile, reviews, newContacts, activityCounts, members, contacts] = await Promise.all([
    getUserById(user.id),
    getReviews(user.id, weeksOfMonth(month)),
    countContactsAdded(user.id, range.from, range.to),
    countActivitiesByType(user.id, range.from, range.to),
    show.team ? listTeamMembers(user.id) : Promise.resolve([]),
    show.contacts ? listContacts(user.id, { sort: "added" }) : Promise.resolve([]),
  ]);

  const summary = summarizeMonth({
    month,
    today: now,
    userCreatedAt: profile?.createdAt ?? new Date(),
    reviews,
  });
  const byWeek = new Map(reviews.map((r) => [r.weekStart, r]));
  const myName = user.name ?? "ฉัน";

  const monthOptions = Array.from({ length: 12 }, (_, i) => shiftMonth(currentMonth, -i));

  return (
    <div className="space-y-5 print:space-y-4 print:text-[12px]">
      <form className="card space-y-3 print:hidden">
        <h1 className="text-xl font-bold text-stone-900">รายงานสำหรับพิมพ์</h1>
        <p className="text-sm text-stone-500">
          เลือกเดือนและหัวข้อ แล้วกดพิมพ์ หรือบันทึกเป็น PDF เพื่อนำไปคุยกับอัพไลน์
        </p>
        <input type="hidden" name="s" value="1" />
        <div>
          <label className="label" htmlFor="month">เดือน</label>
          <select id="month" name="month" defaultValue={month} className="input">
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="space-y-2">
          <legend className="label">หัวข้อที่จะใส่</legend>
          <p className="text-sm text-stone-600">✓ สรุปเดือน (ใส่เสมอ)</p>
          <Check name="weeks" checked={show.weeks}>รายละเอียดรายสัปดาห์</Check>
          <Check name="team" checked={show.team}>ผังสายงาน</Check>
          <Check name="contacts" checked={show.contacts}>
            รายชื่อคน (ชื่อ ความสนใจ กิจกรรมล่าสุด)
          </Check>
        </fieldset>
        <button type="submit" className="btn-secondary w-full">
          อัปเดตรายงาน
        </button>
        <PrintButton />
        <p className="text-xs text-stone-500">
          บนมือถือ: กดปุ่มด้านบน แล้วเลือก &ldquo;บันทึกเป็น PDF&rdquo; หรือแชร์ไฟล์ต่อได้
        </p>
      </form>

      {/* ---------- เนื้อหารายงาน ---------- */}
      <header className="border-b border-stone-300 pb-3">
        <h2 className="text-2xl font-bold text-stone-900">รายงาน{formatMonth(month)}</h2>
        <p className="text-stone-600">
          {myName} · พิมพ์เมื่อ {formatDate(now)}
        </p>
      </header>

      <Section title="สรุปเดือน">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
          <Figure label="คะแนนเฉลี่ยรายสัปดาห์" value={`${fmt(summary.average)}/40`} />
          <Figure
            label="สัปดาห์ที่กรอก"
            value={`${summary.filledWeeks}/${summary.countedWeeks}`}
          />
          <Figure label="รายชื่อใหม่" value={`${newContacts}/${MONTHLY_NEW_CONTACT_GOAL}`} />
        </div>
        <Table
          head={["หมวด", "เฉลี่ย (เต็ม 10)"]}
          rows={CATEGORIES.map((c) => [c.title, fmt(summary.categoryAverages[c.key])])}
        />
        <Table
          head={["กิจกรรมกับรายชื่อ", "ครั้ง"]}
          rows={ACTIVITY_TYPES.map((t) => [ACTIVITY_LABELS[t], String(activityCounts[t])])}
        />
      </Section>

      <Section title="คะแนนรายสัปดาห์">
        <Table
          head={["สัปดาห์", ...CATEGORIES.map((c) => c.title), "รวม"]}
          rows={summary.weeks.map((w) =>
            w.status === "filled"
              ? [
                  formatWeek(w.weekStart),
                  ...CATEGORIES.map((c) => String(byWeek.get(w.weekStart)?.[c.key] ?? "–")),
                  `${w.total}/40`,
                ]
              : [formatWeek(w.weekStart), { span: 5, text: WEEK_STATUS_TEXT[w.status] }],
          )}
        />
      </Section>

      {show.weeks && (
        <Section title="รายละเอียดรายสัปดาห์">
          {summary.weeks.filter((w) => w.status === "filled").length === 0 ? (
            <p className="text-stone-500">ยังไม่มีสัปดาห์ที่กรอกในเดือนนี้</p>
          ) : (
            summary.weeks
              .filter((w) => w.status === "filled")
              .map((w) => (
                <WeekDetail key={w.weekStart} review={byWeek.get(w.weekStart)!} />
              ))
          )}
        </Section>
      )}

      {show.team && <TeamSection members={members} myName={myName} />}

      {show.contacts && (
        <Section title={`รายชื่อคน (${contacts.length})`}>
          {contacts.length === 0 ? (
            <p className="text-stone-500">ยังไม่มีรายชื่อ</p>
          ) : (
            <Table
              head={["ชื่อ", "ความสนใจ", "เพิ่มเมื่อ", "กิจกรรมล่าสุด"]}
              right={[]}
              rows={contacts.map((c) => [
                c.name,
                c.interest ? INTEREST_LABELS[c.interest] : "–",
                formatDate(c.addedOn),
                c.lastActivity ? formatDate(c.lastActivity) : "–",
              ])}
            />
          )}
        </Section>
      )}

      <div className="print:hidden">
        <Link href="/summary" className="btn-ghost w-full">
          กลับไปหน้าสรุปเดือน
        </Link>
      </div>
    </div>
  );
}

function Check({
  name,
  checked,
  children,
}: {
  name: string;
  checked: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 text-stone-700">
      <input type="checkbox" name={name} value="1" defaultChecked={checked} className="h-5 w-5 accent-teal-700" />
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-stone-200 print:break-inside-avoid-page print:rounded-none print:p-0 print:ring-0">
      <h3 className="border-l-4 border-teal-700 pl-2 text-lg font-bold text-stone-900">{title}</h3>
      {children}
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3 print:border print:border-stone-300 print:bg-white">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-xl font-bold text-stone-900">{value}</div>
    </div>
  );
}

type Cell = string | { span: number; text: string };

/** right = คอลัมน์ที่เป็นตัวเลข (ชิดขวา) ค่าเริ่มต้น: ทุกคอลัมน์ยกเว้นคอลัมน์แรก */
function Table({ head, rows, right }: { head: string[]; rows: Cell[][]; right?: number[] }) {
  const isRight = (i: number) => (right ? right.includes(i) : i > 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm print:text-[11px]">
        <thead>
          <tr className="border-b-2 border-stone-300 text-left text-stone-600">
            {head.map((h, i) => (
              <th key={h} className={`px-1.5 py-1 font-semibold ${isRight(i) ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-b border-stone-200 break-inside-avoid">
              {row.map((cell, i) =>
                typeof cell === "string" ? (
                  <td key={i} className={`px-1.5 py-1 align-top ${isRight(i) ? "text-right" : ""}`}>
                    {cell}
                  </td>
                ) : (
                  <td key={i} colSpan={cell.span} className="px-1.5 py-1 text-right text-stone-500">
                    {cell.text}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekDetail({ review }: { review: WeeklyReview }) {
  const learned = LEARNING_ITEMS.filter((i) => review[i.key]);
  return (
    <div className="space-y-1 border-b border-stone-200 pb-3 break-inside-avoid last:border-0">
      <p className="font-semibold text-stone-900">{formatWeek(review.weekStart)}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm print:text-[11px]">
        <dt className="text-stone-500">Priority</dt>
        <dd>
          {review.priorityRank ? `อันดับ ${review.priorityRank}` : "–"}
          {review.priorityScore !== null && ` · ${review.priorityScore}/10`}
        </dd>
        <dt className="text-stone-500">สินค้า</dt>
        <dd>
          {review.productsUsed ? "ใช้สินค้า 5-20 ตัว" : "–"}
          {review.productsScore !== null && ` · ${review.productsScore}/10`}
        </dd>
        <dt className="text-stone-500">การเรียนรู้</dt>
        <dd>
          {learned.length === 0
            ? "–"
            : learned
                .map((i) => (review[i.detailKey] ? `${i.label}: ${review[i.detailKey]}` : i.label))
                .join(" · ")}
          {review.learningScore !== null && ` · ${review.learningScore}/10`}
        </dd>
        <dt className="text-stone-500">ลงมือทำ</dt>
        <dd>
          {review.teamWork
            ? `ทำงานร่วมกับสายงาน${review.teamWorkDetail ? `: ${review.teamWorkDetail}` : ""}`
            : "–"}
          {review.actionScore !== null && ` · ${review.actionScore}/10`}
        </dd>
      </dl>
    </div>
  );
}

function TeamSection({
  members,
  myName,
}: {
  members: TeamMember[];
  myName: string;
}) {
  const { roots, legs, totals } = buildTeamTree(members);
  const chart = layoutChart(roots, myName);
  const ordered: TeamNode<TeamMember>[] = [];
  for (const r of roots) walk(r, (n) => ordered.push(n));
  const nameOf = new Map(members.map((m) => [m.id, m.name]));

  return (
    <Section title="ผังสายงาน">
      {members.length === 0 ? (
        <p className="text-stone-500">ยังไม่มีคนในผังสายงาน</p>
      ) : (
        <>
          <TeamChart {...chart} fit />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
            {TEAM_STATUSES.map((st) => (
              <span key={st.value} className="inline-flex items-center gap-1.5">
                <StatusDot status={st.value} /> {st.label} {totals.statusCounts[st.value]} คน
              </span>
            ))}
          </div>
          <p className="text-sm">
            {totals.legs} สาย · ลึกสุด {totals.depth} ชั้น ·{" "}
            {totals.selfForty === 0
              ? "ยังไม่มีคนที่ทำ 40 คะแนนได้เอง"
              : `มีคนทำ 40 ได้เองใน ${totals.legsWithSelfForty} สาย ลึกถึงชั้นที่ ${totals.selfFortyDepth}`}
          </p>
          <Table
            head={["หัวสาย", "คน", "ทำ 40 ได้เอง", "ลึก"]}
            rows={legs.map((l) => [
              l.root.name,
              String(l.people),
              l.selfForty > 0 ? `${l.selfForty} (ถึงชั้น ${l.selfFortyDepth})` : "0",
              `${l.depth} ชั้น`,
            ])}
          />
          <Table
            head={["ชื่อ", "อัพไลน์", "ชั้น", "สถานะ", "โน้ต"]}
            right={[2]}
            rows={ordered.map((n) => [
              n.name,
              n.parentId ? (nameOf.get(n.parentId) ?? myName) : myName,
              String(n.depth),
              TEAM_STATUS_LABELS[n.status],
              n.note ?? "",
            ])}
          />
        </>
      )}
    </Section>
  );
}

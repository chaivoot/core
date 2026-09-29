import Link from "next/link";
import { QuickAddContact } from "@/components/quick-add-contact";
import { InterestBadge } from "@/components/interest-badge";
import { listContacts, type ContactSort, type InterestFilter } from "@/lib/data/contacts";
import { daysBetween, formatDateShort, today } from "@/lib/dates";
import { requireUser } from "@/lib/session";

export const metadata = { title: "รายชื่อ · 3S1M" };

const SORTS: { value: ContactSort; label: string }[] = [
  { value: "added", label: "เพิ่มล่าสุด" },
  { value: "recent", label: "มีกิจกรรมล่าสุด" },
  { value: "oldest", label: "ไม่มีกิจกรรมนานสุด" },
];

const INTERESTS: { value: InterestFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "business", label: "ธุรกิจ" },
  { value: "product", label: "สินค้า" },
  { value: "none", label: "ยังไม่ระบุ" },
];

function pick<T extends string>(value: unknown, options: { value: T }[], fallback: T): T {
  return options.find((o) => o.value === value)?.value ?? fallback;
}

function lastActivityText(date: string | null, now: string) {
  if (!date) return "ยังไม่มีกิจกรรม";
  const days = daysBetween(date, now);
  if (days === 0) return "กิจกรรมล่าสุด วันนี้";
  if (days < 0) return `นัดไว้ ${formatDateShort(date)}`;
  return `กิจกรรมล่าสุด ${days} วันก่อน`;
}

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const interest = pick(sp.interest, INTERESTS, "all");
  const sort = pick(sp.sort, SORTS, "added");

  const contacts = await listContacts(user.id, { q, interest, sort });
  const now = today();
  const filtered = q !== "" || interest !== "all";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-900">รายชื่อ</h1>

      <QuickAddContact />

      <form className="space-y-2" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="ค้นหาชื่อ"
          className="input"
          aria-label="ค้นหาชื่อ"
        />
        <div className="flex gap-2">
          <select name="interest" defaultValue={interest} className="input" aria-label="ความสนใจ">
            {INTERESTS.map((o) => (
              <option key={o.value} value={o.value}>
                ความสนใจ: {o.label}
              </option>
            ))}
          </select>
          <select name="sort" defaultValue={sort} className="input" aria-label="เรียงตาม">
            {SORTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary w-full">
          ค้นหา / กรอง
        </button>
      </form>

      <p className="text-sm text-stone-500">
        {filtered ? `พบ ${contacts.length} รายชื่อ` : `ทั้งหมด ${contacts.length} รายชื่อ`}
        {filtered && (
          <>
            {" · "}
            <Link href="/contacts" className="text-teal-700 underline">
              ล้างตัวกรอง
            </Link>
          </>
        )}
      </p>

      {contacts.length === 0 ? (
        <p className="card text-center text-stone-500">
          {filtered ? "ไม่พบรายชื่อที่ตรงกับเงื่อนไข" : "ยังไม่มีรายชื่อ ลองนึกถึงคนที่รู้จัก แล้วจดชื่อแรกด้านบนได้เลย"}
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
          {contacts.map((c) => (
            <li key={c.id}>
              <Link href={`/contacts/${c.id}`} className="block px-4 py-3 hover:bg-stone-50">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-stone-900">{c.name}</span>
                  <InterestBadge interest={c.interest} />
                </div>
                <div className="mt-0.5 truncate text-sm text-stone-500">
                  {lastActivityText(c.lastActivity, now)}
                  {c.channel ? ` · ${c.channel}` : ""}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

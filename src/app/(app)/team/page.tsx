import Link from "next/link";
import {
  addTeamMemberAction,
  deleteTeamMemberAction,
  setStatusAction,
  updateTeamMemberAction,
} from "./actions";
import { ConfirmSubmitButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/submit-button";
import { StatusDot, TeamChart } from "@/components/team-chart";
import { ToggleChip } from "@/components/toggle-chip";
import { listTeamMembers } from "@/lib/data/team";
import type { TeamMember } from "@/lib/db/schema";
import { TEAM_STATUSES, TEAM_STATUS_LABELS } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { buildTeamTree, layoutChart, subtreeIds, walk, type TeamNode } from "@/lib/team";

export const metadata = { title: "สายงาน · Core" };

type Node = TeamNode<TeamMember>;
type Option = { id: string; label: string; depth: number };

const MESSAGES: Record<string, string> = {
  invalid: "ข้อมูลไม่ครบหรือไม่ถูกต้อง ลองตรวจอีกครั้ง",
  parent: "เลือกอัพไลน์นี้ไม่ได้ (เป็นตัวเองหรือคนที่อยู่ในสายของตัวเอง)",
  added: "เพิ่มแล้ว",
  saved: "บันทึกแล้ว",
};

export default async function TeamPage({ searchParams }: PageProps<"/team">) {
  const user = await requireUser();
  const sp = await searchParams;
  const members = await listTeamMembers(user.id);
  const { roots, legs, totals } = buildTeamTree(members);

  const myName = user.name ?? "คุณ";
  const chart = layoutChart(roots, myName);

  // ตัวเลือกอัพไลน์ และลำดับการแสดงรายชื่อ เรียงตามผัง
  const ordered: Node[] = [];
  for (const r of roots) walk(r, (n) => ordered.push(n));
  const options: Option[] = ordered.map((n) => ({ id: n.id, depth: n.depth, label: n.name }));
  const nameOf = new Map(members.map((m) => [m.id, m.name]));

  const presetParent =
    typeof sp.parent === "string" && members.some((m) => m.id === sp.parent) ? sp.parent : "";
  const error = typeof sp.e === "string" ? MESSAGES[sp.e] : undefined;
  const ok = typeof sp.ok === "string" ? MESSAGES[sp.ok] : undefined;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">สายงาน</h1>
        <p className="mt-1 text-sm text-stone-500">
          ผังที่คุณบันทึกเอง เห็นเฉพาะคุณคนเดียว ·{" "}
          <Link href="/report" className="text-teal-700 underline">
            Counseling Form
          </Link>
        </p>
      </header>

      {error && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
      {ok && !error && <p className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{ok}</p>}

      <section className="card space-y-3">
        <TeamChart {...chart} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
          {TEAM_STATUSES.map((st) => (
            <span key={st.value} className="inline-flex items-center gap-1.5">
              <StatusDot status={st.value} /> {st.label}
            </span>
          ))}
          {chart.slots > 4 && <span>เลื่อนซ้าย-ขวาเพื่อดูทั้งผัง</span>}
        </div>
      </section>

      {/* key: ให้ฟอร์มสร้างใหม่เมื่อกด "+ เพิ่มคนต่อใต้" จะได้เลือกอัพไลน์ให้ถูก */}
      <form
        key={presetParent}
        id="add"
        action={addTeamMemberAction}
        className="card scroll-mt-4 space-y-3"
      >
        <h2 className="font-semibold text-stone-900">เพิ่มคนในสายงาน</h2>
        <div>
          <label className="label" htmlFor="add-name">ชื่อ</label>
          <input id="add-name" name="name" required maxLength={200} autoComplete="off" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="add-parent">อัพไลน์</label>
          <ParentSelect id="add-parent" myName={myName} options={options} defaultValue={presetParent} />
          <p className="mt-1 text-xs text-stone-500">
            เลือกชื่อคุณ = ต่อจากคุณโดยตรง (สายใหม่) · เลือกคนในสายงาน = ต่อใต้คนนั้น
          </p>
          {presetParent && (
            <Link href="/team#add" className="mt-1 inline-block text-sm text-stone-500">
              ล้าง
            </Link>
          )}
        </div>
        <div>
          <span className="label">สถานะ</span>
          <div className="flex flex-wrap gap-2">
            {TEAM_STATUSES.map((st) => (
              <ToggleChip key={st.value} type="radio" name="status" value={st.value} required>
                {st.label}
              </ToggleChip>
            ))}
          </div>
        </div>
        <SubmitButton className="btn-primary w-full">เพิ่ม</SubmitButton>
      </form>

      {members.length > 0 && (
        <section className="card space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat value={totals.legs} label="สาย" />
            <Stat value={totals.depth} label="ชั้นลึกสุด" />
            <Stat value={totals.selfForty} label="ทำ 40 ได้เอง" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {TEAM_STATUSES.map((st) => (
              <div key={st.value} className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-stone-600">
                  <StatusDot status={st.value} /> {st.label}
                </span>
                <span className="font-semibold text-stone-900">{totals.statusCounts[st.value]}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-stone-600">
            {totals.selfForty === 0
              ? "ยังไม่มีคนที่ทำ 40 คะแนนได้เอง"
              : `มีคนทำ 40 คะแนนได้เองใน ${totals.legsWithSelfForty} จาก ${totals.legs} สาย ลึกถึงชั้นที่ ${totals.selfFortyDepth}`}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-stone-500">
                <tr>
                  <th className="py-1 pr-2 font-medium">หัวสาย</th>
                  <th className="px-1 py-1 text-right font-medium">คน</th>
                  <th className="px-1 py-1 text-right font-medium">ทำ 40 ได้เอง</th>
                  <th className="py-1 pl-1 text-right font-medium">ลึก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {legs.map((l) => (
                  <tr key={l.root.id}>
                    <td className="max-w-32 truncate py-2 pr-2 text-stone-800">{l.root.name}</td>
                    <td className="px-1 py-2 text-right">{l.people}</td>
                    <td className="px-1 py-2 text-right">
                      {l.selfForty}
                      {l.selfForty > 0 && (
                        <span className="text-stone-400"> (ถึงชั้น {l.selfFortyDepth})</span>
                      )}
                    </td>
                    <td className="py-2 pl-1 text-right">{l.depth} ชั้น</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {ordered.length === 0 ? (
        <p className="card text-center text-stone-500">
          ยังไม่มีคนในสายงาน เริ่มจากคนที่ต่อจากคุณโดยตรงก่อนก็ได้
        </p>
      ) : (
        <section className="space-y-2">
          <h2 className="font-semibold text-stone-900">คนในผัง</h2>
          <p className="text-sm text-stone-500">กดวงกลมในชาร์ตเพื่อเลื่อนมาที่คนนั้น</p>
          <ul className="space-y-2">
            {ordered.map((n) => (
              <MemberCard
                key={n.id}
                node={n}
                myName={myName}
                upline={n.parentId ? (nameOf.get(n.parentId) ?? myName) : myName}
                options={options}
                members={members}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-2">
      <div className="text-2xl font-bold text-stone-900">{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}

function ParentSelect({
  id,
  myName,
  options,
  defaultValue,
  exclude,
}: {
  id: string;
  myName: string;
  options: Option[];
  defaultValue: string;
  exclude?: Set<string>;
}) {
  return (
    <select id={id} name="parentId" defaultValue={defaultValue} className="input">
      <option value="">{myName} (คุณ)</option>
      {options
        .filter((o) => !exclude?.has(o.id))
        .map((o) => (
          <option key={o.id} value={o.id}>
            {"\u2003".repeat(o.depth)}
            {o.label} (ชั้น {o.depth})
          </option>
        ))}
    </select>
  );
}

function MemberCard({
  node,
  myName,
  upline,
  options,
  members,
}: {
  node: Node;
  myName: string;
  upline: string;
  options: Option[];
  members: TeamMember[];
}) {
  return (
    <li id={`m-${node.id}`} className="card scroll-mt-4 p-3 target:ring-2 target:ring-teal-600">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-stone-900">{node.name}</div>
          <div className="truncate text-xs text-stone-500">
            ชั้น {node.depth} · อัพไลน์ {upline}
            {node.children.length > 0 && ` · ต่อใต้ ${node.children.length} คน`}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-stone-700">
          <StatusDot status={node.status} /> {TEAM_STATUS_LABELS[node.status]}
        </span>
      </div>
      {node.note && <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{node.note}</p>}

      <form
        action={setStatusAction.bind(null, node.id)}
        className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1"
        aria-label={`สถานะของ ${node.name}`}
      >
        {TEAM_STATUSES.map((st) => {
          const active = node.status === st.value;
          return (
            <button
              key={st.value}
              type="submit"
              name="status"
              value={st.value}
              aria-pressed={active}
              className={`min-h-9 rounded-lg px-1 text-xs font-medium leading-tight ${
                active ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-300" : "text-stone-500"
              }`}
            >
              {st.label}
            </button>
          );
        })}
      </form>

      <div className="mt-2 text-sm">
        <Link href={`/team?parent=${node.id}#add`} className="text-teal-700">
          + เพิ่มคนต่อใต้ {node.name}
        </Link>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-stone-500 select-none">แก้ไข</summary>
        <form action={updateTeamMemberAction.bind(null, node.id)} className="mt-3 space-y-3">
          <input type="hidden" name="status" value={node.status} />
          <div>
            <label className="label" htmlFor={`${node.id}-name`}>ชื่อ</label>
            <input id={`${node.id}-name`} name="name" required maxLength={200} defaultValue={node.name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor={`${node.id}-parent`}>อัพไลน์</label>
            <ParentSelect
              id={`${node.id}-parent`}
              myName={myName}
              options={options}
              defaultValue={node.parentId ?? ""}
              exclude={subtreeIds(members, node.id)}
            />
          </div>
          <div>
            <label className="label" htmlFor={`${node.id}-note`}>โน้ต</label>
            <textarea id={`${node.id}-note`} name="note" rows={2} maxLength={2000} defaultValue={node.note ?? ""} className="input" />
          </div>
          <SubmitButton className="btn-primary w-full">บันทึก</SubmitButton>
        </form>
        <form action={deleteTeamMemberAction.bind(null, node.id)} className="mt-2">
          <ConfirmSubmitButton
            message={`ลบ "${node.name}" ออกจากผัง? คนที่ต่อใต้จะเลื่อนขึ้นมาแทนที่`}
            className="btn-danger w-full"
          >
            ลบออกจากผัง
          </ConfirmSubmitButton>
        </form>
      </details>
    </li>
  );
}

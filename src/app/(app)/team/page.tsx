import Link from "next/link";
import {
  addTeamMemberAction,
  deleteTeamMemberAction,
  toggleSelfFortyAction,
  updateTeamMemberAction,
} from "./actions";
import { ConfirmSubmitButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/submit-button";
import { ToggleChip } from "@/components/toggle-chip";
import { listTeamMembers } from "@/lib/data/team";
import type { TeamMember } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { buildTeamTree, subtreeIds, walk, type TeamNode } from "@/lib/team";

export const metadata = { title: "สายงาน · Core" };

type Node = TeamNode<TeamMember>;
type Option = { id: string; label: string };

const MESSAGES: Record<string, string> = {
  invalid: "ข้อมูลไม่ครบหรือไม่ถูกต้อง ลองตรวจอีกครั้ง",
  parent: "ย้ายไปอยู่ใต้คนนี้ไม่ได้ (เป็นตัวเองหรือคนที่อยู่ใต้ตัวเอง)",
  added: "เพิ่มแล้ว",
  saved: "บันทึกแล้ว",
};

export default async function TeamPage({ searchParams }: PageProps<"/team">) {
  const user = await requireUser();
  const sp = await searchParams;
  const members = await listTeamMembers(user.id);
  const { roots, legs, totals } = buildTeamTree(members);

  // ตัวเลือก "อยู่ใต้" เรียงตามผัง
  const options: (Option & { depth: number })[] = [];
  for (const r of roots)
    walk(r, (n) => options.push({ id: n.id, depth: n.depth, label: n.name }));

  const presetParent =
    typeof sp.parent === "string" && members.some((m) => m.id === sp.parent) ? sp.parent : "";
  const error = typeof sp.e === "string" ? MESSAGES[sp.e] : undefined;
  const ok = typeof sp.ok === "string" ? MESSAGES[sp.ok] : undefined;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">สายงาน</h1>
        <p className="mt-1 text-sm text-stone-500">ผังที่คุณบันทึกเอง เห็นเฉพาะคุณคนเดียว</p>
      </header>

      {error && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
      {ok && !error && <p className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{ok}</p>}

      {members.length > 0 && (
        <section className="card space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat value={totals.legs} label="สาย" />
            <Stat value={totals.depth} label="ชั้นลึกสุด" />
            <Stat value={totals.selfForty} label="ทำ 40 ได้เอง" />
          </div>
          <p className="text-sm text-stone-600">
            {totals.selfForty === 0
              ? "ยังไม่มีคนที่ติ๊กว่าทำ 40 คะแนนได้เอง"
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

      {/* key: ให้ฟอร์มสร้างใหม่เมื่อกด "+ เพิ่มคนใต้" จะได้เลือก "อยู่ใต้" ให้ถูก */}
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
          <label className="label" htmlFor="add-parent">อยู่ใต้</label>
          <ParentSelect id="add-parent" options={options} defaultValue={presetParent} />
          {presetParent && (
            <Link href="/team#add" className="mt-1 inline-block text-sm text-stone-500">
              ล้าง
            </Link>
          )}
        </div>
        <ToggleChip name="selfForty">ทำ 40 คะแนนได้ด้วยตัวเองแล้ว</ToggleChip>
        <SubmitButton className="btn-primary w-full">เพิ่ม</SubmitButton>
      </form>

      {roots.length === 0 ? (
        <p className="card text-center text-stone-500">
          ยังไม่มีคนในสายงาน เริ่มจากคนที่อยู่ใต้คุณโดยตรงก่อนก็ได้
        </p>
      ) : (
        <section className="space-y-2">
          <h2 className="font-semibold text-stone-900">ผัง</h2>
          <ul className="space-y-2">
            {roots.map((r) => (
              <TreeNode key={r.id} node={r} options={options} members={members} />
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
  options,
  defaultValue,
  exclude,
}: {
  id: string;
  options: (Option & { depth: number })[];
  defaultValue: string;
  exclude?: Set<string>;
}) {
  return (
    <select id={id} name="parentId" defaultValue={defaultValue} className="input">
      <option value="">คุณ (เป็นหัวสายใหม่)</option>
      {options
        .filter((o) => !exclude?.has(o.id))
        .map((o) => (
          <option key={o.id} value={o.id}>
            {" ".repeat(o.depth - 1)}
            {o.label} (ชั้น {o.depth})
          </option>
        ))}
    </select>
  );
}

function TreeNode({
  node,
  options,
  members,
}: {
  node: Node;
  options: (Option & { depth: number })[];
  members: TeamMember[];
}) {
  return (
    <li>
      <div className="card p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium text-stone-900">{node.name}</div>
            <div className="text-xs text-stone-500">
              ชั้น {node.depth}
              {node.children.length > 0 && ` · ใต้ ${node.children.length} คน`}
            </div>
          </div>
          <form action={toggleSelfFortyAction.bind(null, node.id, !node.selfForty)}>
            <SubmitButton
              pendingText="…"
              className={`btn min-h-9 shrink-0 rounded-full px-3 text-sm ${
                node.selfForty
                  ? "bg-teal-700 text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-300"
              }`}
              aria-pressed={node.selfForty}
            >
              {node.selfForty ? "✓ ทำ 40 ได้เอง" : "ทำ 40 ได้เอง?"}
            </SubmitButton>
          </form>
        </div>
        {node.note && <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{node.note}</p>}

        <div className="mt-2 flex items-center gap-3 text-sm">
          <Link href={`/team?parent=${node.id}#add`} className="text-teal-700">
            + เพิ่มคนใต้ {node.name}
          </Link>
        </div>

        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-stone-500 select-none">แก้ไข</summary>
          <form action={updateTeamMemberAction.bind(null, node.id)} className="mt-3 space-y-3">
            <input type="hidden" name="selfForty" value={node.selfForty ? "on" : ""} />
            <div>
              <label className="label" htmlFor={`${node.id}-name`}>ชื่อ</label>
              <input id={`${node.id}-name`} name="name" required maxLength={200} defaultValue={node.name} className="input" />
            </div>
            <div>
              <label className="label" htmlFor={`${node.id}-parent`}>อยู่ใต้</label>
              <ParentSelect
                id={`${node.id}-parent`}
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
              message={`ลบ "${node.name}" ออกจากผัง? คนที่อยู่ใต้จะเลื่อนขึ้นมาแทนที่`}
              className="btn-danger w-full"
            >
              ลบออกจากผัง
            </ConfirmSubmitButton>
          </form>
        </details>
      </div>

      {node.children.length > 0 && (
        <ul className="mt-2 space-y-2 border-l-2 border-stone-200 pl-3">
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} options={options} members={members} />
          ))}
        </ul>
      )}
    </li>
  );
}

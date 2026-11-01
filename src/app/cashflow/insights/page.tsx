import type { Metadata } from "next";
import { STYLES, type GameReport, type PlayerReport, type StyleKey } from "@/lib/cashflow/analysis";
import { money } from "@/lib/cashflow/data";
import type { GameEvent } from "@/lib/cashflow/engine";
import { listGames } from "@/lib/data/cashflow";
import { requireAdmin } from "@/lib/session";
import { PlayerReportCard } from "../[code]/report";

export const metadata: Metadata = { title: "กระแสเงินสด · ภาพรวมการเล่น" };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const num = (x: number | null, digits = 0) => (x === null ? "—" : x.toLocaleString("th-TH", { maximumFractionDigits: digits }));

type CardStat = { label: string; shown: number; bought: number; declinedCash: number; declinedLoan: number; declinedNo: number };

// ภาพรวมจากทุกเกมที่เก็บไว้ (ผู้ดูแลเท่านั้น)
export default async function InsightsPage() {
  await requireAdmin();
  const games = await listGames(500);
  const reports = games.map((g) => g.report as GameReport);
  const players: (PlayerReport & { game: GameReport })[] = reports.flatMap((r) => r.players.map((p) => ({ ...p, game: r })));
  const escaped = players.filter((p) => p.escapeRoll !== null);

  // อาชีพ
  const byProf = new Map<string, typeof players>();
  for (const p of players) byProf.set(p.profession, [...(byProf.get(p.profession) ?? []), p]);

  // สไตล์
  const styleRows = (Object.keys(STYLES) as StyleKey[]).map((k) => {
    const list = players.filter((p) => p.style === k);
    return { k, n: list.length, escaped: list.filter((p) => p.escapeRoll !== null).length, won: list.filter((p) => p.won).length };
  });

  // การ์ด: ซื้อ/ไม่ซื้อ จากเหตุการณ์ดิบ
  const cards = new Map<string, CardStat>();
  for (const g of games) {
    for (const e of g.events as GameEvent[]) {
      if (!e.x || !["buyAsset", "declineAsset", "buyStock", "declineStock"].includes(e.k)) continue;
      const c = cards.get(e.x) ?? { label: e.x, shown: 0, bought: 0, declinedCash: 0, declinedLoan: 0, declinedNo: 0 };
      c.shown++;
      if (e.k.startsWith("buy")) c.bought++;
      else if (e.a === "cash") c.declinedCash++;
      else if (e.a === "loan") c.declinedLoan++;
      else c.declinedNo++;
      cards.set(e.x, c);
    }
  }
  const cardList = [...cards.values()];
  const mostSkipped = [...cardList].sort((a, b) => b.declinedCash - a.declinedCash).filter((c) => c.declinedCash > 0).slice(0, 12);
  const mostBought = [...cardList].sort((a, b) => b.bought - a.bought).filter((c) => c.bought > 0).slice(0, 12);

  const goodDebt = players.reduce((s, p) => s + p.goodDebt, 0);
  const badDebt = players.reduce((s, p) => s + p.badDebt, 0);
  const winners = players.filter((p) => p.won);
  const others = players.filter((p) => !p.won);

  const kpis: [string, string][] = [
    ["เกมทั้งหมด", num(reports.length)],
    ["จบแบบมีคนชนะ", `${reports.filter((r) => r.endedBy === "win").length}`],
    ["host กดจบ / หมดอายุ", `${reports.filter((r) => r.endedBy === "host").length} / ${reports.filter((r) => r.endedBy === "expired").length}`],
    ["ผู้เล่นทั้งหมด", num(players.length)],
    ["เวลาเฉลี่ยต่อเกม", `${num(avg(reports.flatMap((r) => (r.minutes === null ? [] : [r.minutes]))))} นาที`],
    ["ออกจากสนามแข่งหนูได้", `${escaped.length} คน (${pct(escaped.length, players.length)})`],
    ["ออกได้ในตาที่ (เฉลี่ย)", num(avg(escaped.map((p) => p.escapeRoll!)), 1)],
    ["เงินกู้ที่เป็นหนี้ดี", `${pct(goodDebt, goodDebt + badDebt)} (${money(goodDebt)})`],
  ];

  const compare: [string, (p: PlayerReport) => number, (x: number) => string][] = [
    ["ซื้อทรัพย์สิน (ครั้ง)", (p) => p.assetBuys, (x) => num(x, 1)],
    ["ซื้อหุ้น/ทอง (ครั้ง)", (p) => p.stockBuys, (x) => num(x, 1)],
    ["ปล่อยดีลทั้งที่มีเงินพอ (ครั้ง)", (p) => p.declinedWithCash, (x) => num(x, 1)],
    ["หนี้ดี", (p) => p.goodDebt, money],
    ["หนี้เสีย", (p) => p.badDebt, money],
    ["จ่ายฟุ่มเฟือย", (p) => p.doodads, money],
    ["ทำบุญ (ครั้ง)", (p) => p.charityGiven, (x) => num(x, 1)],
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold">ภาพรวมการเล่น · กระแสเงินสด</h1>
        <p className="text-sm text-stone-500">เก็บจากเกมที่จบแล้ว (มีคนชนะ, host กดจบ หรือห้องหมดอายุระหว่างเล่น)</p>
      </div>

      {reports.length === 0 ? (
        <p className="card p-6 text-center text-stone-500">ยังไม่มีเกมที่เก็บไว้ เล่นจบสักเกม (หรือให้ host กด &quot;จบเกม · ดูสรุป&quot;) แล้วข้อมูลจะขึ้นที่นี่</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {kpis.map(([k, v]) => (
              <div key={k} className="card p-4">
                <p className="text-sm text-stone-500">{k}</p>
                <p className="mt-1 text-xl font-bold">{v}</p>
              </div>
            ))}
          </section>

          <section className="card overflow-x-auto p-4">
            <h2 className="mb-2 font-semibold">คนชนะ vs คนอื่น (ค่าเฉลี่ยต่อคน)</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-stone-500">
                <tr>
                  <th className="py-1">พฤติกรรม</th>
                  <th className="pl-3 text-right">คนชนะ ({winners.length})</th>
                  <th className="pl-3 text-right">คนอื่น ({others.length})</th>
                </tr>
              </thead>
              <tbody>
                {compare.map(([label, f, fmt]) => {
                  const w = avg(winners.map(f));
                  const o = avg(others.map(f));
                  return (
                    <tr key={label} className="border-t border-stone-100">
                      <td className="py-1">{label}</td>
                      <td className="pl-3 text-right font-medium">{w === null ? "—" : fmt(w)}</td>
                      <td className="pl-3 text-right">{o === null ? "—" : fmt(o)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card overflow-x-auto p-4">
              <h2 className="mb-2 font-semibold">สไตล์การลงทุน</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-stone-500">
                  <tr>
                    <th className="py-1">สไตล์</th>
                    <th className="pl-3 text-right">คน</th>
                    <th className="pl-3 text-right">ออกจากสนามแข่งหนู</th>
                    <th className="pl-3 text-right">ชนะ</th>
                  </tr>
                </thead>
                <tbody>
                  {styleRows.map((r) => (
                    <tr key={r.k} className="border-t border-stone-100">
                      <td className="py-1">
                        {STYLES[r.k].icon} {STYLES[r.k].label}
                      </td>
                      <td className="pl-3 text-right">{r.n}</td>
                      <td className="pl-3 text-right">{pct(r.escaped, r.n)}</td>
                      <td className="pl-3 text-right">{r.won}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card overflow-x-auto p-4">
              <h2 className="mb-2 font-semibold">อาชีพ</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-stone-500">
                  <tr>
                    <th className="py-1">อาชีพ</th>
                    <th className="pl-3 text-right">คน</th>
                    <th className="pl-3 text-right">ออกได้</th>
                    <th className="pl-3 text-right">ออกได้ในตาที่</th>
                    <th className="pl-3 text-right">อิสรภาพเฉลี่ย</th>
                  </tr>
                </thead>
                <tbody>
                  {[...byProf.entries()]
                    .sort((a, b) => b[1].length - a[1].length)
                    .map(([prof, list]) => {
                      const esc = list.filter((p) => p.escapeRoll !== null);
                      return (
                        <tr key={prof} className="border-t border-stone-100">
                          <td className="py-1">{prof}</td>
                          <td className="pl-3 text-right">{list.length}</td>
                          <td className="pl-3 text-right">{pct(esc.length, list.length)}</td>
                          <td className="pl-3 text-right">{num(avg(esc.map((p) => p.escapeRoll!)), 1)}</td>
                          <td className="pl-3 text-right">{num(avg(list.map((p) => p.freedomPct)))}%</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <CardTable title="การ์ดที่คนปล่อยทั้งที่มีเงินพอ" rows={mostSkipped} />
            <CardTable title="การ์ดที่คนซื้อบ่อย" rows={mostBought} />
          </div>

          <section className="space-y-3">
            <h2 className="font-semibold">เกมล่าสุด</h2>
            {games.slice(0, 30).map((g) => {
              const r = g.report as GameReport;
              return (
                <details key={g.id} className="card p-4">
                  <summary className="cursor-pointer">
                    <span className="font-medium">{g.createdAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</span>
                    <span className="text-stone-500">
                      {" "}
                      · ห้อง {g.roomCode} · {r.players.length} คน · ทอย {r.rolls} ครั้ง
                      {r.minutes !== null && ` · ${r.minutes} นาที`} ·{" "}
                      {r.endedBy === "win" ? `🏆 ${r.winner}` : r.endedBy === "host" ? "host จบเกม" : "หมดอายุ"}
                    </span>
                  </summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {r.players.map((p) => (
                      <PlayerReportCard key={p.id} r={p} />
                    ))}
                  </div>
                </details>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}

function CardTable({ title, rows }: { title: string; rows: CardStat[] }) {
  return (
    <section className="card overflow-x-auto p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">ยังไม่มีข้อมูล</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-stone-500">
            <tr>
              <th className="py-1">การ์ด</th>
              <th className="pl-3 text-right">เปิด</th>
              <th className="pl-3 text-right">ซื้อ</th>
              <th className="pl-3 text-right">ไม่ซื้อ (เงินพอ)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.label} className="border-t border-stone-100">
                <td className="py-1">{c.label}</td>
                <td className="pl-3 text-right">{c.shown}</td>
                <td className="pl-3 text-right">{c.bought}</td>
                <td className="pl-3 text-right">{c.declinedCash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

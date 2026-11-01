"use client";

import { STYLES, type GameReport, type PlayerReport } from "@/lib/cashflow/analysis";
import { colorHex, money } from "@/lib/cashflow/data";
import { Rat } from "./game-ui";

/** สรุปผลการเล่นของผู้เล่นหนึ่งคน (มือถือ: ของตัวเอง · จอ host: ทุกคน) */
export function PlayerReportCard({ r, compact = false }: { r: PlayerReport; compact?: boolean }) {
  const style = STYLES[r.style];
  const stats: [string, string][] = [
    ["ตาที่เล่น", `${r.rolls}`],
    ["ซื้อทรัพย์สิน", `${r.assetBuys} ครั้ง`],
    ["ซื้อหุ้น/ทอง", `${r.stockBuys} ครั้ง`],
    ["ปล่อยดีล (มีเงินพอ)", `${r.declinedWithCash} ครั้ง`],
    ["หนี้ดี (กู้ลงทุน)", money(r.goodDebt)],
    ["หนี้เสีย", money(r.badDebt)],
    ["กำไรหุ้น/ทอง", money(r.stockProfit)],
    ["จ่ายฟุ่มเฟือย", money(r.doodads)],
  ];
  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Rat color={r.color} className="w-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold" style={{ color: colorHex(r.color) }}>
            {r.name} {r.won && "🏆"}
          </p>
          <p className="text-sm text-stone-500">{r.profession}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl">{style.icon}</p>
          <p className="text-sm font-semibold">{style.label}</p>
        </div>
      </div>
      <p className="text-sm text-stone-600">{style.desc}</p>

      <div>
        <div className="h-2.5 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${r.freedomPct}%` }} />
        </div>
        <p className="mt-0.5 text-xs text-stone-500">
          {r.escapeRoll !== null
            ? `ออกจากสนามแข่งหนูในตาที่ ${r.escapeRoll}`
            : `รายได้จากทรัพย์สิน ${money(r.passive)} / รายจ่าย ${money(r.expenses)} (${Math.floor(r.freedomPct)}%)`}
        </p>
      </div>

      {!compact && (
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {stats.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-stone-100 py-0.5">
              <dt className="text-stone-500">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <ul className="space-y-1 text-sm text-stone-700">
        {(compact ? r.insights.slice(0, 3) : r.insights).map((t) => (
          <li key={t} className="flex gap-2">
            <span className="text-stone-400">•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** หัวข้อสรุปเกม */
export function GameSummaryHeader({ report }: { report: GameReport }) {
  return (
    <div className="card space-y-1 p-4 text-center">
      <p className="text-lg font-bold">สรุปผลการเล่น</p>
      <p className="text-sm text-stone-500">
        {report.winner ? `🏆 ${report.winner} ชนะ` : report.endedBy === "time" ? "⏰ หมดเวลา" : "host จบเกม"} · ทอยทั้งหมด {report.rolls} ครั้ง
        {report.minutes !== null && ` · ${report.minutes} นาที`}
      </p>
    </div>
  );
}

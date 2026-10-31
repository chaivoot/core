"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BIG_DEALS,
  DOODADS,
  MARKETS,
  SMALL_DEALS,
  STOCK_LABEL,
  baht,
  colorHex,
} from "@/lib/cashflow/data";
import type { Action, Card, PublicPlayer, PublicState } from "@/lib/cashflow/engine";

export type RoomData = { version: number; me: string | null; state: PublicState };
type ClientAction = Exclude<Action, { type: "join" }> | { type: "join"; name: string; color: string };

/** ดึงสถานะห้องทุก 1 วินาที (เกมผลัดกันเล่น ช้ากว่าเรียลไทม์นิดหน่อยไม่เป็นไร) */
export function useRoom(code: string) {
  const [data, setData] = useState<RoomData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const version = useRef(-1);
  const url = `/cashflow/${code}/api`;

  const accept = useCallback((j: RoomData) => {
    if (j.version >= version.current) {
      version.current = j.version;
      setData(j);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const r = await fetch(`${url}?v=${version.current}`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) setError(j.error ?? "เชื่อมต่อไม่ได้");
        else if (!j.same) accept(j);
      } catch {
        // เน็ตหลุดชั่วคราว รอบหน้าค่อยลองใหม่
      }
      if (alive) timer = setTimeout(poll, 1000);
    }
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [url, accept]);

  const send = useCallback(
    async (action: ClientAction) => {
      setBusy(true);
      setError(null);
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(j.error ?? "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
          return false;
        }
        accept(j);
        return true;
      } catch {
        setError("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [url, accept],
  );

  return { data, error, busy, send, clearError: () => setError(null) };
}

/** นาฬิกาสำหรับนับถอยหลัง (อัปเดตทุกวินาที) */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function Rat({ color, className = "w-10" }: { color: string; className?: string }) {
  const c = colorHex(color);
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
      <path d="M14 27 C 6 32, 1 24, 5 17" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="27" cy="26" rx="15" ry="10.5" fill={c} />
      <ellipse cx="44" cy="23" rx="10" ry="8" fill={c} />
      <circle cx="40" cy="14" r="5.5" fill={c} />
      <circle cx="40" cy="14" r="3" fill="#fecdd3" />
      <circle cx="47.5" cy="20.5" r="2" fill="#fff" />
      <circle cx="48" cy="20.5" r="1" fill="#111" />
      <circle cx="54" cy="24.5" r="2" fill="#fb7185" />
      <ellipse cx="20" cy="36" rx="3.5" ry="2" fill={c} />
      <ellipse cx="34" cy="36" rx="3.5" ry="2" fill={c} />
    </svg>
  );
}

export function PlayerTag({ p, className = "" }: { p: PublicPlayer; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Rat color={p.color} className="w-8 shrink-0" />
      <span className="font-semibold" style={{ color: colorHex(p.color) }}>
        {p.name}
      </span>
    </span>
  );
}

type CardInfo = { kind: string; tone: string; title: string; lines: string[] };

const TONE = {
  deal: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  big: "bg-teal-50 text-teal-900 ring-teal-200",
  doodad: "bg-rose-50 text-rose-900 ring-rose-200",
  market: "bg-sky-50 text-sky-900 ring-sky-200",
  info: "bg-amber-50 text-amber-900 ring-amber-200",
};

export function describeCard(card: Card): CardInfo {
  if (card.deck === "small" || card.deck === "big") {
    const d = (card.deck === "small" ? SMALL_DEALS : BIG_DEALS)[card.index];
    const kind = card.deck === "small" ? "ดีลเล็ก" : "ดีลใหญ่";
    const tone = card.deck === "small" ? TONE.deal : TONE.big;
    if (d.type === "stock") {
      return {
        kind,
        tone,
        title: `${STOCK_LABEL[d.stock]} ราคา ฿${d.price}`,
        lines: ["คนเปิดการ์ดซื้อได้ (ทีละ 100 หุ้น)", "ใครถือหุ้นนี้อยู่ ขายได้ในราคานี้"],
      };
    }
    if (d.type === "split") return { kind, tone, title: d.text, lines: [] };
    const full = d.price * (d.units ?? 1);
    return {
      kind,
      tone,
      title: d.name,
      lines: [
        `ราคา ${baht(full)}`,
        d.mortgage > 0 ? `เงินดาวน์ ${baht(d.down)} · จำนอง ${baht(d.mortgage)}` : `จ่ายสด ${baht(d.down)}`,
        `กระแสเงินสด ${d.cashflow >= 0 ? "+" : ""}${baht(d.cashflow)}/เดือน`,
      ],
    };
  }
  if (card.deck === "doodad") {
    const d = DOODADS[card.index];
    return { kind: "จ่ายไม่คาดฝัน", tone: TONE.doodad, title: d.text, lines: [`จ่าย ${baht(d.amount)}`] };
  }
  if (card.deck === "market") {
    return { kind: "ตลาด", tone: TONE.market, title: MARKETS[card.index].text, lines: [] };
  }
  const info: Record<string, [string, string]> = {
    payday: ["เงินเดือนออก", "ได้รับกระแสเงินสดประจำเดือน"],
    charity: ["ทำบุญ", "บริจาค 10% ของรายได้ แล้วเลือกทอย 2 ลูกได้ 3 ตา"],
    baby: ["มีลูก", "ค่าเลี้ยงลูกเพิ่ม 1 คน"],
    downsize: ["ตกงาน", "จ่ายค่าใช้จ่าย 1 เดือน และหยุด 2 ตา"],
    bankrupt: ["ล้มละลาย", "เงินไม่พอจ่าย เริ่มต้นใหม่ด้วยอาชีพเดิม"],
  };
  const [title, line] = info[card.deck];
  return { kind: "ช่องพิเศษ", tone: TONE.info, title, lines: [line] };
}

/** big = กลางกระดานบนจอ host: ขนาดตัวอักษรตามขนาดกระดาน (หน่วย cqw ของกระดาน) */
export function CardView({ card, big = false }: { card: Card; big?: boolean }) {
  const c = describeCard(card);
  return (
    <div className={`rounded-2xl ring-1 ${c.tone} ${big ? "p-[2cqw]" : "p-4"}`}>
      <p className={`font-medium opacity-70 ${big ? "text-[1.8cqw]" : "text-xs"}`}>{c.kind}</p>
      <p className={`font-bold leading-snug ${big ? "mt-[0.3cqw] text-[3.2cqw]" : "mt-0.5 text-lg"}`}>{c.title}</p>
      {c.lines.map((l) => (
        <p key={l} className={big ? "mt-[0.3cqw] text-[2.1cqw] leading-snug" : "mt-0.5 text-sm"}>
          {l}
        </p>
      ))}
    </div>
  );
}

export function Dice({ dice, big = false }: { dice: number[]; big?: boolean }) {
  const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return (
    <span className={`inline-flex items-center gap-1 ${big ? "text-[5.5cqw] leading-none" : "text-3xl"}`} aria-label={`ทอยได้ ${dice.join(" + ")}`}>
      {dice.map((d, i) => (
        <span key={i}>{faces[d - 1]}</span>
      ))}
    </span>
  );
}

export function FreedomBar({ passive, expenses }: { passive: number; expenses: number }) {
  const pct = expenses > 0 ? Math.min(100, Math.max(0, (passive / expenses) * 100)) : 0;
  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-xs text-stone-500">
        รายได้จากทรัพย์สิน {baht(passive)} / รายจ่าย {baht(expenses)} ({Math.floor(pct)}%)
      </p>
    </div>
  );
}

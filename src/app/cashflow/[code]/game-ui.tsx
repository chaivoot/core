"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameReport, PlayerReport } from "@/lib/cashflow/analysis";
import {
  BIG_DEALS,
  DECK_VERSION,
  DOODADS,
  DREAMS,
  FAST_BUSINESSES,
  FAST_EVENTS,
  MARKETS,
  SMALL_DEALS,
  STOCK_LABEL,
  money,
  lotOf,
  priceRange,
  unitOf,
  colorHex,
} from "@/lib/cashflow/data";
import type { Action, Card, PublicPlayer, PublicState } from "@/lib/cashflow/engine";

export type RoomData = { version: number; me: string | null; deck?: string; build?: string; stale?: boolean; state: PublicState; report?: GameReport | null; mine?: PlayerReport | null };
/** ค่าที่เซิร์ฟเวอร์สุ่มให้ (token, รหัสย้ายเครื่อง) ไม่ต้องส่งมาจากเครื่อง */
type ClientAction =
  | Exclude<Action, { type: "join" | "transfer" | "claim" }>
  | { type: "join"; name: string; color: string }
  | { type: "transfer"; player: string }
  | { type: "claim"; code: string };

/**
 * หน้านี้เปิดค้างไว้ตั้งแต่ก่อนอัปเดตการ์ด (โค้ดในเครื่องเป็นชุดเก่า) → รีเฟรชให้เอง ครั้งเดียวต่อเวอร์ชัน
 * ไม่งั้นการ์ดบนจอกับบนเซิร์ฟเวอร์จะเป็นคนละใบ
 */
function reloadIfOutdated(serverDeck: string | undefined, serverBuild?: string) {
  // โค้ดในเครื่องเก่ากว่าเซิร์ฟเวอร์ (มี deploy ใหม่ระหว่างเปิดหน้าค้างไว้) ก็รีเฟรชเหมือนกัน ไม่งั้นปุ่มใหม่ ๆ ไม่ขึ้น
  const newBuild = !!serverBuild && serverBuild !== process.env.APP_BUILD;
  if ((!serverDeck || serverDeck === DECK_VERSION) && !newBuild) return false;
  try {
    const key = `cf-reload-${serverDeck}-${serverBuild}`;
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {
    // ใช้ sessionStorage ไม่ได้ ก็รีเฟรชเลย
  }
  window.location.reload();
  return true;
}

/** ดึงสถานะห้องทุก 1 วินาที (เกมผลัดกันเล่น ช้ากว่าเรียลไทม์นิดหน่อยไม่เป็นไร) */
export function useRoom(code: string) {
  const [data, setData] = useState<RoomData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const version = useRef(-1);
  const url = `/cashflow/${code}/api`;

  const accept = useCallback((j: RoomData) => {
    if (reloadIfOutdated(j.deck, j.build)) return;
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
        else if (j.same) reloadIfOutdated(j.deck, j.build);
        else accept(j);
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
    async (action: ClientAction): Promise<(RoomData & { transferCode?: string }) | false> => {
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
        return j as RoomData & { transferCode?: string };
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
/** เวลาเกม: เล่นมาเท่าไหร่ เหลือเท่าไหร่ (ถ้าตั้งเวลาเล่นไว้) */
export function gameClock(state: PublicState, now: number) {
  const limit = (state.options?.minutes ?? 0) * 60_000;
  const start = state.startedAt ?? now;
  const end = state.phase === "over" ? (state.endedAt ?? now) : now;
  const elapsed = Math.max(0, end - start);
  return { elapsed, limit, remaining: limit ? Math.max(0, limit - elapsed) : null, up: limit > 0 && elapsed >= limit };
}

/** 1:05:09 / 42:15 */
export function fmtClock(ms: number) {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

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

type Tone = { band: string; icon: string };
type CardInfo = { kind: string; tone: Tone; title: string; lines: string[] };

/** สีหัวการ์ดแต่ละกอง (ใช้กับกองการ์ดบนกระดานด้วย) */
export const DECK_TONE: Record<"small" | "big" | "doodad" | "market", Tone & { label: string }> = {
  small: { band: "bg-emerald-600", icon: "💡", label: "ดีลเล็ก" },
  big: { band: "bg-teal-800", icon: "🏢", label: "ดีลใหญ่" },
  market: { band: "bg-sky-600", icon: "📈", label: "ตลาด" },
  doodad: { band: "bg-rose-600", icon: "💸", label: "จ่ายซะ" },
};

const SPECIAL: Record<string, [string, string, Tone]> = {
  payday: ["เงินเดือน", "ได้รับกระแสเงินสดประจำเดือน", { band: "bg-amber-500", icon: "💰" }],
  charity: ["ทำบุญ", "บริจาค 10% ของรายได้ แล้วเลือกทอย 2 ลูกได้ 3 ตา", { band: "bg-violet-600", icon: "🙏" }],
  baby: ["มีลูก", "ค่าเลี้ยงลูกเพิ่ม 1 คน", { band: "bg-pink-500", icon: "👶" }],
  downsize: ["ตกงาน", "จ่ายค่าใช้จ่าย 1 เดือน และหยุด 2 ตา", { band: "bg-stone-600", icon: "📉" }],
  bankrupt: ["ล้มละลาย", "เงินไม่พอจ่าย เริ่มต้นใหม่ด้วยอาชีพเดิม", { band: "bg-stone-900", icon: "⚠️" }],
  fastPay: ["วันรับเงิน", "ได้รับรายได้ต่อรอบ", { band: "bg-amber-600", icon: "💵" }],
};

export function describeCard(card: Card): CardInfo {
  if (card.deck === "small" || card.deck === "big") {
    const d = (card.deck === "small" ? SMALL_DEALS : BIG_DEALS)[card.index];
    const kind = DECK_TONE[card.deck].label;
    const tone = DECK_TONE[card.deck];
    if (d.type === "stock") {
      const unit = unitOf(d.stock);
      return {
        kind,
        tone: d.stock === "gold" ? { band: "bg-amber-500", icon: "🪙" } : tone,
        title: d.text ?? `${STOCK_LABEL[d.stock]} ราคา ${money(d.price)}`,
        lines: [
          ...(d.news ? [`📰 ${d.news}`] : []),
          ...(d.stock === "gold"
            ? []
            : [`ช่วงราคา ${money(priceRange(d.stock).lo)}–${money(priceRange(d.stock).hi)}`]),
          d.max ? `คนเปิดการ์ดซื้อได้สูงสุด ${d.max} ${unit}` : `คนเปิดการ์ดซื้อได้ (ทีละ ${lotOf(d.stock)} ${unit})`,
          `ใครมี${STOCK_LABEL[d.stock]}อยู่ ขายได้ในราคานี้`,
        ],
      };
    }
    if (d.type === "split") return { kind, tone, title: d.text, lines: [] };
    if (d.type === "lend") return { kind, tone: { band: "bg-rose-600", icon: "🤲" }, title: d.text, lines: [`จ่ายทันที ${money(d.amount)}`] };
    const full = d.price * (d.units ?? 1);
    return {
      kind,
      tone,
      title: d.name,
      lines: [
        ...(d.situation ? [`📍 ${d.situation}`] : []),
        `ราคา ${money(full)}`,
        d.mortgage > 0 ? `เงินดาวน์ ${money(d.down)} · จำนอง ${money(d.mortgage)}` : `จ่ายสด ${money(d.down)}`,
        `กระแสเงินสด ${d.cashflow >= 0 ? "+" : ""}${money(d.cashflow)}/เดือน`,
      ],
    };
  }
  if (card.deck === "doodad") {
    const d = DOODADS[card.index];
    return { kind: DECK_TONE.doodad.label, tone: DECK_TONE.doodad, title: d.text, lines: [`จ่าย ${money(d.amount)}`] };
  }
  if (card.deck === "market") {
    return { kind: DECK_TONE.market.label, tone: DECK_TONE.market, title: MARKETS[card.index].text, lines: [] };
  }
  if (card.deck === "fastBiz") {
    const b = FAST_BUSINESSES[card.index];
    return {
      kind: "ทางด่วน · ธุรกิจ",
      tone: { band: "bg-teal-700", icon: "🏭" },
      title: b.name,
      lines: [`ราคา ${money(b.cost)} (จ่ายสด)`, `รายได้ต่อรอบ +${money(b.cashflow)}`],
    };
  }
  if (card.deck === "dream") {
    const d = DREAMS[card.index];
    return {
      kind: "ทางด่วน · ความฝัน",
      tone: { band: "bg-violet-600", icon: d.icon },
      title: d.name,
      lines: [`ราคา ${money(d.cost)}`, "ใครเลือกความฝันนี้ไว้ ซื้อได้แล้วชนะ"],
    };
  }
  if (card.deck === "fastEvent") {
    const e = FAST_EVENTS[card.index];
    return { kind: "ทางด่วน · เหตุการณ์", tone: { band: "bg-rose-700", icon: "⚠️" }, title: e.text, lines: [] };
  }
  const [title, line, tone] = SPECIAL[card.deck];
  return { kind: "ช่องพิเศษ", tone, title, lines: [line] };
}

/**
 * การ์ดแบบใบ: หัวสีตามกอง + ไอคอน พลิกเปิดทุกครั้งที่ใบเปลี่ยน (ให้คนเรียกใส่ key)
 * big = กลางกระดานบนจอ host: ขนาดตัวอักษรตามขนาดกระดาน (หน่วย cqw)
 */
export function CardView({ card, big = false }: { card: Card; big?: boolean }) {
  const c = describeCard(card);
  return (
    <div className="animate-card-flip overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-stone-200">
      <div className={`flex items-center gap-2 text-white ${c.tone.band} ${big ? "px-[1.6cqw] py-[0.7cqw] text-[1.75cqw]" : "px-4 py-1.5 text-sm"}`}>
        <span className={big ? "text-[2.3cqw]" : "text-lg"}>{c.tone.icon}</span>
        <span className="font-semibold tracking-wide">{c.kind}</span>
      </div>
      <div className={big ? "px-[1.6cqw] py-[1.2cqw]" : "px-4 py-3"}>
        <p className={`font-bold leading-snug text-stone-900 ${big ? "text-[2.9cqw]" : "text-lg"}`}>{c.title}</p>
        {c.lines.map((l) => (
          <p key={l} className={`text-stone-700 ${big ? "mt-[0.3cqw] text-[1.95cqw] leading-snug" : "mt-0.5 text-sm"}`}>
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

/** key สำหรับ CardView: เปลี่ยนเมื่อเปิดการ์ดใบใหม่ (ให้พลิกใหม่) */
export function cardKey(state: { turn: number; dice: number[] | null; card: Card | null }) {
  const c = state.card;
  return c ? `${state.turn}-${state.dice?.join(",") ?? ""}-${c.deck}-${c.index ?? ""}` : "none";
}

export function Dice({ dice, big = false }: { dice: number[]; big?: boolean }) {
  const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return (
    <span className={`inline-flex items-center gap-1 ${big ? "text-[4.6cqw] leading-none" : "text-3xl"}`} aria-label={`ทอยได้ ${dice.join(" + ")}`}>
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
        รายได้จากทรัพย์สิน {money(passive)} / รายจ่าย {money(expenses)} ({Math.floor(pct)}%)
      </p>
    </div>
  );
}

"use client";

// กระดานเกม (ทางด่วนสี่เหลี่ยมล้อมสนามแข่งหนู + กองการ์ด + หนู) ใช้ทั้งจอ host และมือถือ

import { useEffect, useState, type ReactNode } from "react";
import {
  BOARD,
  DREAMS,
  FAST_BOARD,
  FAST_BUSINESSES,
  FAST_EVENTS,
  SQUARE_LABEL,
  colorHex,
  type FastSquare,
  type Square,
} from "@/lib/cashflow/data";
import type { PublicPlayer, PublicState } from "@/lib/cashflow/engine";
import { DECK_TONE, Rat } from "./game-ui";

const SQUARE_COLOR: Record<Square, { fill: string; text: string }> = {
  opportunity: { fill: "#16a34a", text: "#ffffff" },
  payday: { fill: "#facc15", text: "#422006" },
  market: { fill: "#0284c7", text: "#ffffff" },
  doodad: { fill: "#dc2626", text: "#ffffff" },
  charity: { fill: "#7c3aed", text: "#ffffff" },
  baby: { fill: "#db2777", text: "#ffffff" },
  downsize: { fill: "#57534e", text: "#ffffff" },
};

// พิกัดใน viewBox 1000×1000
const C = 500;
/** วงใน (สนามแข่งหนู) เป็นวงกลม อยู่ในกรอบสี่เหลี่ยมของทางด่วน */
const RR_OUT = 376;
const RR_IN = 236;
const STEP = 360 / BOARD.length;
/** ทางด่วนเป็นสี่เหลี่ยม 9×9 ช่อง เดินรอบขอบ = 32 ช่อง */
const GRID = 9;
const CELL = 1000 / GRID;

const point = (r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)] as const;
};

function segment(center: number, width: number, outer: number, inner: number) {
  const a0 = center - width / 2 + 0.6;
  const a1 = center + width / 2 - 0.6;
  const [x0, y0] = point(outer, a0);
  const [x1, y1] = point(outer, a1);
  const [x2, y2] = point(inner, a1);
  const [x3, y3] = point(inner, a0);
  return `M${x0} ${y0} A${outer} ${outer} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${inner} ${inner} 0 0 0 ${x3} ${y3} Z`;
}

/** ช่องทางด่วนที่ i อยู่คอลัมน์/แถวไหน (ตามเข็มนาฬิกาจากมุมซ้ายบน) */
function fastCell(i: number) {
  if (i < 8) return { col: i, row: 0 };
  if (i < 16) return { col: 8, row: i - 8 };
  if (i < 24) return { col: 8 - (i - 16), row: 8 };
  return { col: 0, row: 8 - (i - 24) };
}

const FAST_STYLE = {
  payday: { fill: "#f59e0b" },
  biz: { fill: "#14b8a6" },
  dream: { fill: "#a78bfa" },
  event: { fill: "#fb7185" },
} as const;

function fastText(sq: FastSquare) {
  if (sq.type === "payday") return { icon: "💵", name: "วันรับเงิน", sub: "" };
  if (sq.type === "biz") {
    const b = FAST_BUSINESSES[sq.index];
    return { icon: "🏭", name: b.short, sub: `${shortBaht(b.cost)} · +${shortBaht(b.cashflow)}` };
  }
  if (sq.type === "dream") {
    const d = DREAMS[sq.index];
    return { icon: d.icon, name: d.short, sub: shortBaht(d.cost) };
  }
  return { icon: "⚠️", name: FAST_EVENTS[sq.index].short, sub: "" };
}

/** ตัวเลขย่อสำหรับช่องเล็ก ๆ เช่น 6.5 ล้าน, 150k */
function shortBaht(n: number) {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toLocaleString("th-TH", { maximumFractionDigits: 1 })} ล้าน`;
  return `฿${(n / 1000).toLocaleString("th-TH", { maximumFractionDigits: 1 })}k`;
}

function Label({ r, deg, fill, size, fit, children }: { r: number; deg: number; fill: string; size: number; fit?: number; children: string }) {
  const [x, y] = point(r, deg);
  // ตัวหนังสือวางตามแนวรัศมี (หมุน −90° จากแนวช่อง) ฝั่งซ้ายกลับด้านให้อ่านจากซ้ายไปขวา
  const rot = deg > 180 && deg < 360 ? deg + 90 : deg - 90;
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={size}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="middle"
      // ตัวอักษรไทยมีสระ/วรรณยุกต์ด้านบน กึ่งกลางของฟอนต์จึงสูงกว่าตัวพยัญชนะ เลื่อนลงให้ตัวหนังสืออยู่กลางช่องจริง ๆ
      dy={size * 0.12}
      transform={`rotate(${rot} ${x} ${y})`}
      {...(fit ? { textLength: fit, lengthAdjust: "spacingAndGlyphs" } : {})}
    >
      {children}
    </text>
  );
}

function Board({ players }: { players: PublicPlayer[] }) {
  return (
    <svg viewBox="0 0 1000 1000" className="absolute inset-0 size-full" aria-hidden="true">
      {/* ทางด่วน: กรอบสี่เหลี่ยมรอบนอก */}
      <rect x={0} y={0} width={1000} height={1000} rx={18} fill="#c7d2fe" />
      {FAST_BOARD.map((sq, i) => {
        const { col, row } = fastCell(i);
        const x = col * CELL;
        const y = row * CELL;
        const t = fastText(sq);
        const corner = sq.type === "payday";
        const dreamers = sq.type === "dream" ? players.filter((p) => p.fast?.dream === sq.index) : [];
        return (
          <g key={`f${i}`}>
            <rect x={x + 3} y={y + 3} width={CELL - 6} height={CELL - 6} rx={10} fill={FAST_STYLE[sq.type].fill} />
            <text x={x + CELL / 2} y={y + (corner ? 42 : 30)} fontSize={corner ? 34 : 26} textAnchor="middle" dominantBaseline="middle">
              {t.icon}
            </text>
            <text
              x={x + CELL / 2}
              y={y + (corner ? 80 : 62)}
              fill="#1c1917"
              fontSize={corner ? 17 : 15}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="middle"
              {...(t.name.length > 10 ? { textLength: CELL - 16, lengthAdjust: "spacingAndGlyphs" } : {})}
            >
              {t.name}
            </text>
            {t.sub && (
              <text
                x={x + CELL / 2}
                y={y + 88}
                fill="#292524"
                fontSize={12.5}
                textAnchor="middle"
                dominantBaseline="middle"
                {...(t.sub.length > 16 ? { textLength: CELL - 14, lengthAdjust: "spacingAndGlyphs" } : {})}
              >
                {t.sub}
              </text>
            )}
            {/* จุดสีของคนที่เลือกความฝันนี้ */}
            {dreamers.map((p, k) => (
              <circle key={p.id} cx={x + 14 + k * 14} cy={y + 14} r={6} fill={colorHex(p.color)} stroke="#fff" strokeWidth={2} />
            ))}
          </g>
        );
      })}
      <rect x={CELL} y={CELL} width={CELL * 7} height={CELL * 7} fill="#fafaf9" rx={8} />

      {/* สนามแข่งหนู */}
      {BOARD.map((sq, i) => {
        const deg = i * STEP;
        const c = SQUARE_COLOR[sq];
        const label = SQUARE_LABEL[sq];
        return (
          <g key={i}>
            <path d={segment(deg, STEP, RR_OUT, RR_IN)} fill={c.fill} stroke="#fff" strokeWidth={3} />
            <Label r={(RR_OUT + RR_IN) / 2} deg={deg} fill={c.text} size={30} fit={label.length > 8 ? 108 : undefined}>
              {label}
            </Label>
          </g>
        );
      })}
    </svg>
  );
}

type Spot = { track: "r" | "f"; pos: number };
const spotOf = (p: PublicPlayer): Spot => (p.fast ? { track: "f", pos: p.fast.pos } : { track: "r", pos: p.pos });

/** ตำแหน่งหนู (เป็น % ของกระดาน) ถ้าหลายตัวอยู่ช่องเดียวกัน วางเรียงกันในช่อง */
function ratSpot(spot: Spot, k: number, count: number) {
  if (spot.track === "f") {
    const { col, row } = fastCell(spot.pos);
    const dx = count === 1 ? 0 : (k % 2 === 0 ? -1 : 1) * 2.4;
    const dy = count <= 2 ? 1.2 : (k < 2 ? -1 : 1) * 2.2 + 1.2;
    return { x: (col + 0.5) * (100 / GRID) + dx, y: (row + 0.5) * (100 / GRID) + dy };
  }
  // หนูอยู่ขอบด้านในของวง (ไม่บังชื่อช่อง) เรียงได้แถวละ 3 ตัว
  const row = Math.floor(k / 3);
  const inRow = Math.min(3, count - row * 3);
  const side = (k % 3) - (inRow - 1) / 2;
  const r = 234 - row * 30;
  const [x, y] = point(r, spot.pos * STEP + side * STEP * 0.42);
  return { x: x / 10, y: y / 10 };
}

type PileDeck = keyof typeof DECK_TONE;

/** กองการ์ดที่มุมด้านในของกระดาน */
function Pile({ deck, left, active }: { deck: PileDeck; left: number; active: boolean }) {
  const t = DECK_TONE[deck];
  return (
    <div className={`relative w-full transition ${active ? "-translate-y-[0.5cqw] scale-105" : ""}`}>
      {[2, 1].map((o) => (
        <div
          key={o}
          className="absolute inset-0 rounded-[0.8cqw] bg-white ring-1 ring-stone-300"
          style={{ transform: `translate(${o * 0.4}cqw, ${o * 0.4}cqw)` }}
        />
      ))}
      <div className={`relative overflow-hidden rounded-[0.8cqw] bg-white shadow ring-1 ${active ? "ring-4 ring-amber-400" : "ring-stone-300"}`}>
        <div className={`${t.band} py-[0.4cqw] text-center text-[2cqw] leading-none`}>{t.icon}</div>
        <div className="px-[0.3cqw] py-[0.4cqw] text-center">
          <p className="text-[1.25cqw] leading-tight font-bold whitespace-nowrap text-stone-800">{t.label}</p>
          <p className="text-[1.05cqw] text-stone-500">เหลือ {left} ใบ</p>
        </div>
      </div>
    </div>
  );
}

const PILE_SPOTS: { deck: PileDeck; cls: string }[] = [
  { deck: "small", cls: "left-[12.2%] top-[13.5%]" },
  { deck: "big", cls: "right-[12.8%] top-[13.5%]" },
  { deck: "market", cls: "left-[12.2%] bottom-[12.6%]" },
  { deck: "doodad", cls: "right-[12.8%] bottom-[12.6%]" },
];

/** หนูเดินทีละช่องไปหาตำแหน่งจริง (เปลี่ยนวงเมื่อไหร่ กระโดดไปเลย) */
function useShownPositions(players: PublicPlayer[]) {
  const [shown, setShown] = useState<Record<string, Spot>>({});
  const target = JSON.stringify(players.map((p) => [p.id, spotOf(p)]));
  useEffect(() => {
    const goal: [string, Spot][] = JSON.parse(target);
    const t = setInterval(() => {
      setShown((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [id, spot] of goal) {
          const cur = next[id];
          if (!cur || cur.track !== spot.track) {
            next[id] = spot;
            changed = true;
          } else if (cur.pos !== spot.pos) {
            const len = spot.track === "f" ? FAST_BOARD.length : BOARD.length;
            next[id] = { track: cur.track, pos: (cur.pos + 1) % len };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 260);
    return () => clearInterval(t);
  }, [target]);
  return shown;
}

/** กระดานทั้งแผ่น ขนาดตามความกว้างของกล่อง (children = เนื้อหาตรงกลางวง) */
export function GameBoard({ state, className = "", children }: { state: PublicState; className?: string; children?: ReactNode }) {
  const shown = useShownPositions(state.players);
  return (
    <div className={`@container relative aspect-square ${className}`}>
      <Board players={state.players} />
      {/* กองการ์ด 4 กองที่มุม */}
      {PILE_SPOTS.map(({ deck, cls }) => (
        <div key={deck} className={`absolute w-[9%] ${cls}`}>
          <Pile deck={deck} left={state.deckLeft[deck]} active={state.card?.deck === deck} />
        </div>
      ))}

      {/* หนูบนกระดาน (HTML ซ้อนบน SVG ขยับนุ่ม ๆ ด้วย transition) */}
      {state.players.map((p) => {
        const spot = shown[p.id] ?? spotOf(p);
        const same = state.players.filter((x) => {
          const o = shown[x.id] ?? spotOf(x);
          return o.track === spot.track && o.pos === spot.pos;
        });
        const k = same.findIndex((x) => x.id === p.id);
        const { x, y } = ratSpot(spot, k, same.length);
        return (
          <div
            key={p.id}
            className="absolute z-10 w-[4.4%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 p-[0.3%] drop-shadow-md transition-all duration-200"
            style={{ left: `${x}%`, top: `${y}%` }}
            title={p.name}
          >
            <Rat color={p.color} className="w-full" />
          </div>
        );
      })}
      {children}
    </div>
  );
}

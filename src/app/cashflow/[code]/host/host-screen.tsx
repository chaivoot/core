"use client";

import { useEffect, useState } from "react";
import {
  BOARD,
  DREAMS,
  FAST_BOARD,
  FAST_BUSINESSES,
  FAST_EVENTS,
  FAST_GOAL,
  MAX_PLAYERS,
  MIN_PLAYERS,
  SQUARE_LABEL,
  baht,
  colorHex,
  type FastSquare,
  type Square,
} from "@/lib/cashflow/data";
import {
  monthlyCashflow,
  passiveIncome,
  profession,
  totalExpenses,
  type PublicPlayer,
  type PublicState,
} from "@/lib/cashflow/engine";
import { IntroSlide, INTRO_SLIDES } from "../intro";
import { CardView, DECK_TONE, Dice, FreedomBar, PlayerTag, Rat, cardKey, useNow, useRoom } from "../game-ui";

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
/** วงใน (วงหนูวิ่ง) เป็นวงกลม อยู่ในกรอบสี่เหลี่ยมของทางด่วน */
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
  return `฿${(n / 1000).toLocaleString("th-TH")}k`;
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

      {/* วงหนูวิ่ง */}
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

export function HostScreen({ code, joinUrl, qrSvg }: { code: string; joinUrl: string; qrSvg: string }) {
  const { data, error, busy, send } = useRoom(code);
  const now = useNow();
  const state = data?.state;
  const shown = useShownPositions(state?.players ?? []);
  /** เพิ่งเล่าคำอธิบายจบ: กลับมาหน้า QR ให้คนมาทีหลังสแกนเข้าก่อนเริ่มเกม */
  const [introDone, setIntroDone] = useState(false);

  if (!state) return <p className="p-8 text-center text-stone-500">กำลังโหลด…</p>;

  const turnPlayer = state.players[state.turn];

  if (state.phase === "lobby" && state.intro != null) {
    const i = Math.min(state.intro, INTRO_SLIDES.length - 1);
    const last = i === INTRO_SLIDES.length - 1;
    return (
      <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 p-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-stone-900">กระแสเงินสด</h1>
          <div className="flex items-center gap-3 text-sm text-stone-500">
            <span>
              ยังเข้าห้องได้ รหัส <b className="font-mono text-lg tracking-widest text-stone-800">{code}</b> · ผู้เล่น{" "}
              {state.players.length} คน
            </span>
            <div className="w-16 rounded-lg bg-white p-1 ring-1 ring-stone-200" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </div>
        </div>
        <div className="card flex-1 p-[4%]">
          <IntroSlide index={i} big />
        </div>
        <div className="flex items-center justify-between gap-3">
          <button className="btn-ghost" disabled={busy} onClick={() => send({ type: "intro", slide: null })}>
            ปิดคำอธิบาย
          </button>
          <div className="flex gap-3">
            <button className="btn-secondary text-lg" disabled={busy || i === 0} onClick={() => send({ type: "intro", slide: i - 1 })}>
              ← ก่อนหน้า
            </button>
            {last ? (
              <button
                className="btn-primary text-lg"
                disabled={busy}
                onClick={async () => {
                  if (await send({ type: "intro", slide: null })) setIntroDone(true);
                }}
              >
                จบคำอธิบาย → เปิด QR ให้คนมาทีหลัง
              </button>
            ) : (
              <button className="btn-primary text-lg" disabled={busy} onClick={() => send({ type: "intro", slide: i + 1 })}>
                ถัดไป →
              </button>
            )}
          </div>
        </div>
        {error && <p className="text-center text-rose-700">{error}</p>}
      </main>
    );
  }

  if (state.phase === "lobby") {
    return (
      <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 p-8 lg:grid-cols-2">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-stone-900">กระแสเงินสด</h1>
          {introDone ? (
            <p className="mt-3 rounded-2xl bg-amber-100 px-4 py-2 text-xl font-semibold text-amber-900">
              เล่าจบแล้ว! ใครยังไม่ได้เข้า สแกน QR ตอนนี้เลย
            </p>
          ) : (
            <p className="mt-2 text-xl text-stone-600">สแกน QR ด้วยมือถือเพื่อเข้าเล่น</p>
          )}
          <div
            className="mx-auto mt-6 w-full max-w-sm rounded-3xl bg-white p-4 shadow ring-1 ring-stone-200"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="mt-4 text-lg text-stone-600">
            รหัสห้อง <span className="font-mono text-3xl font-bold tracking-widest text-stone-900">{code}</span>
          </p>
          <p className="mt-1 break-all text-sm text-stone-500">{joinUrl}</p>
        </div>
        <div className="card space-y-5 p-6">
          <h2 className="text-2xl font-semibold">
            ผู้เล่น {state.players.length}/{MAX_PLAYERS}
          </h2>
          {state.players.length === 0 ? (
            <p className="text-stone-500">ยังไม่มีใครเข้าห้อง</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {state.players.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                  <Rat color={p.color} className="w-16" />
                  <span className="text-xl font-semibold" style={{ color: colorHex(p.color) }}>
                    {p.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button className="btn-secondary w-full text-lg" disabled={busy} onClick={() => send({ type: "intro", slide: 0 })}>
            📖 อธิบายเป้าหมายและ ESBI ก่อนเริ่ม
          </button>
          <label className="flex items-start gap-3 rounded-2xl bg-stone-50 p-3">
            <input
              type="checkbox"
              className="mt-1 size-5"
              checked={state.options?.resellDeals === true}
              disabled={busy}
              onChange={(e) => send({ type: "setOptions", resellDeals: e.target.checked })}
            />
            <span>
              <b>ซื้อดีลต่อได้</b>
              <span className="block text-sm text-stone-500">ดีลที่คนเปิดไม่ซื้อ ส่งให้คนอื่นซื้อต่อ ใครกดก่อนได้ก่อน (ปิด = ทิ้งไป)</span>
            </span>
          </label>
          <button
            className="btn-primary w-full text-xl"
            disabled={busy || state.players.length < MIN_PLAYERS}
            onClick={() => send({ type: "start" })}
          >
            เริ่มเกม
          </button>
          {state.players.length < MIN_PLAYERS && (
            <p className="text-center text-sm text-stone-500">ต้องมีผู้เล่นอย่างน้อย {MIN_PLAYERS} คน</p>
          )}
          {error && <p className="text-center text-rose-700">{error}</p>}
        </div>
      </main>
    );
  }

  const winner = state.players.find((p) => p.id === state.winner);
  const waiting = Object.entries(state.responders);
  const secondsLeft = state.deadline ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : null;

  return (
    <main className="grid min-h-dvh gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      {/* กระดาน: ทางด่วนสี่เหลี่ยมล้อมวงหนูวิ่ง */}
      <div className="@container relative mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-2rem))]">
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
              className={`absolute w-[4.4%] -translate-x-1/2 -translate-y-1/2 z-10 rounded-full bg-white/90 p-[0.3%] drop-shadow-md transition-all duration-200`}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={p.name}
            >
              <Rat color={p.color} className="w-full" />
            </div>
          );
        })}

        {/* กลางวง */}
        <div className="absolute inset-[26.6%] flex flex-col items-center justify-center gap-[0.8cqw] overflow-hidden rounded-full bg-white p-[2%] text-center shadow-inner ring-1 ring-stone-200">
          {state.phase === "over" && winner ? (
            <>
              <Rat color={winner.color} className="w-[12cqw]" />
              <p className="text-[3.5cqw] font-bold" style={{ color: colorHex(winner.color) }}>
                {winner.name}
              </p>
              <p className="text-[2.4cqw] font-semibold text-emerald-700">ชนะเกม! 🏆</p>
              <p className="text-[1.6cqw] text-stone-600">
                {winner.fast?.dreamBought
                  ? `ซื้อความฝัน "${DREAMS[winner.fast.dream].name}" ได้แล้ว`
                  : `รายได้ต่อรอบเพิ่มขึ้นถึง ${baht(FAST_GOAL)}`}
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-[0.8cqw] text-[1.9cqw] text-stone-500">
                ตาของ
                <Rat color={turnPlayer.color} className="w-[4.5cqw]" />
                <b style={{ color: colorHex(turnPlayer.color) }}>{turnPlayer.name}</b>
              </p>
              {state.dice && <Dice dice={state.dice} big />}
              {state.card ? (
                <div className="w-full">
                  <CardView key={cardKey(state)} card={state.card} big />
                </div>
              ) : (
                <p className="text-[1.9cqw] text-stone-500">
                  {state.step === "roll" && "รอทอยลูกเต๋า…"}
                  {state.step === "deal" && "เลือกดีลเล็กหรือดีลใหญ่…"}
                  {state.step === "dream" && "เลือกความฝันบนทางด่วน…"}
                </p>
              )}
              {state.step === "respond" && state.resale && (
                <p className="text-[1.6cqw] font-semibold text-amber-700">เปิดให้คนอื่นซื้อต่อ ใครกดก่อนได้ก่อน!</p>
              )}
              {state.step === "respond" && (
                <div className="flex flex-wrap justify-center gap-[0.6cqw] text-[1.4cqw]">
                  {waiting.map(([id, done]) => {
                    const p = state.players.find((x) => x.id === id);
                    if (!p) return null;
                    return (
                      <span key={id} className="flex items-center gap-1 rounded-full bg-stone-100 px-[1cqw] py-[0.2cqw]">
                        <Rat color={p.color} className="w-[2.6cqw]" />
                        {p.name} {done ? "✓" : "กำลังเลือก…"}
                      </span>
                    );
                  })}
                  {secondsLeft !== null && <span className="px-2 py-0.5 text-stone-500">เหลือ {secondsLeft} วินาที</span>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ผู้เล่นและบันทึก */}
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">กระแสเงินสด</h1>
          <span className="font-mono text-stone-500">ห้อง {code}</span>
        </div>
        {state.players.map((p, i) => (
          <PlayerCard key={p.id} p={p} active={i === state.turn && state.phase === "playing"} />
        ))}
        {state.phase === "playing" && (
          <button className="btn-ghost w-full text-sm" disabled={busy} onClick={() => send({ type: "skipTurn" })}>
            ข้ามตาของ {turnPlayer.name} (กรณีค้าง)
          </button>
        )}
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <Log state={state} />
      </aside>
    </main>
  );
}

function PlayerCard({ p, active }: { p: PublicPlayer; active: boolean }) {
  const ring = active ? { boxShadow: `0 0 0 3px ${colorHex(p.color)}` } : undefined;
  if (p.fast) {
    const f = p.fast;
    const gained = f.income - (f.goal - FAST_GOAL);
    const pct = Math.min(100, Math.max(0, (gained / FAST_GOAL) * 100));
    const dream = DREAMS[f.dream];
    return (
      <div className="card space-y-2 bg-indigo-950 p-3 text-indigo-50 ring-indigo-900" style={ring}>
        <div className="flex items-center justify-between gap-2">
          <PlayerTag p={p} />
          <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-indigo-950">🚀 ทางด่วน</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>
            เงินสด <b>{baht(p.cash)}</b>
          </span>
          <span>
            รายได้ต่อรอบ <b>{baht(f.income)}</b>
          </span>
        </div>
        <div>
          <div className="h-2.5 overflow-hidden rounded-full bg-indigo-800">
            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-0.5 text-xs text-indigo-200">
            เพิ่มรายได้แล้ว {baht(gained)} / {baht(FAST_GOAL)}
            {dream && ` · ความฝัน: ${dream.icon} ${dream.name} (${baht(dream.cost)})`}
          </p>
        </div>
        {p.skip > 0 && <p className="text-xs text-indigo-200">พักรักษาตัว หยุดอีก {p.skip} ตา</p>}
      </div>
    );
  }
  const cf = monthlyCashflow(p);
  return (
    <div className="card space-y-2 p-3" style={ring}>
      <div className="flex items-center justify-between gap-2">
        <PlayerTag p={p} />
        <span className="text-sm text-stone-500">{profession(p).name}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>
          เงินสด <b>{baht(p.cash)}</b>
        </span>
        <span>
          กระแสเงินสด <b className={cf < 0 ? "text-rose-700" : ""}>{baht(cf)}</b>/เดือน
        </span>
      </div>
      <FreedomBar passive={passiveIncome(p)} expenses={totalExpenses(p)} />
      {p.skip > 0 && <p className="text-xs text-stone-500">ตกงาน หยุดอีก {p.skip} ตา</p>}
    </div>
  );
}

function Log({ state }: { state: PublicState }) {
  return (
    <div className="card max-h-72 overflow-y-auto p-3 text-sm">
      <ul className="space-y-1 text-stone-700">
        {[...state.log].reverse().map((l, i) => (
          <li key={state.log.length - i} className={i === 0 ? "font-medium text-stone-900" : ""}>
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

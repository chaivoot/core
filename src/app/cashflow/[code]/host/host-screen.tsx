"use client";

import { useEffect, useState } from "react";
import { BOARD, MAX_PLAYERS, MIN_PLAYERS, SQUARE_LABEL, baht, colorHex, type Square } from "@/lib/cashflow/data";
import {
  monthlyCashflow,
  passiveIncome,
  profession,
  totalExpenses,
  type PublicPlayer,
  type PublicState,
} from "@/lib/cashflow/engine";
import { CardView, Dice, FreedomBar, PlayerTag, Rat, useNow, useRoom } from "../game-ui";

const SQUARE_COLOR: Record<Square, { fill: string; text: string; icon: string }> = {
  opportunity: { fill: "#bbf7d0", text: "#14532d", icon: "💡" },
  payday: { fill: "#fcd34d", text: "#78350f", icon: "💰" },
  market: { fill: "#bae6fd", text: "#0c4a6e", icon: "📈" },
  doodad: { fill: "#fecdd3", text: "#881337", icon: "💸" },
  charity: { fill: "#ddd6fe", text: "#4c1d95", icon: "🙏" },
  baby: { fill: "#fbcfe8", text: "#831843", icon: "👶" },
  downsize: { fill: "#d6d3d1", text: "#292524", icon: "📉" },
};

// พิกัดใน viewBox 1000×1000 มุม 0 = บนสุด หมุนตามเข็มนาฬิกา
const C = 500;
const OUTER = 492;
const INNER = 292;
const STEP = 360 / BOARD.length;
const point = (r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)] as const;
};

function segment(i: number) {
  const a0 = i * STEP - STEP / 2 + 0.6;
  const a1 = i * STEP + STEP / 2 - 0.6;
  const [x0, y0] = point(OUTER, a0);
  const [x1, y1] = point(OUTER, a1);
  const [x2, y2] = point(INNER, a1);
  const [x3, y3] = point(INNER, a0);
  return `M${x0} ${y0} A${OUTER} ${OUTER} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${INNER} ${INNER} 0 0 0 ${x3} ${y3} Z`;
}

/** หมุนตัวหนังสือตามช่อง ครึ่งล่างกลับหัวให้อ่านได้ */
function upright(deg: number) {
  return deg > 90 && deg < 270 ? deg + 180 : deg;
}

function RingBoard() {
  return (
    <svg viewBox="0 0 1000 1000" className="absolute inset-0 size-full" aria-hidden="true">
      {BOARD.map((sq, i) => {
        const deg = i * STEP;
        const c = SQUARE_COLOR[sq];
        const [lx, ly] = point(458, deg);
        const [ix, iy] = point(412, deg);
        const label = SQUARE_LABEL[sq];
        return (
          <g key={i}>
            <path d={segment(i)} fill={c.fill} stroke="#fff" strokeWidth={3} />
            <text
              x={lx}
              y={ly}
              fill={c.text}
              fontSize={label.length > 8 ? 17 : 20}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${upright(deg)} ${lx} ${ly})`}
            >
              {label}
            </text>
            <text x={ix} y={iy} fontSize={30} textAnchor="middle" dominantBaseline="middle">
              {c.icon}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** ตำแหน่งหนู (เป็น % ของกระดาน) ถ้าหลายตัวอยู่ช่องเดียวกัน วางเรียงกันในช่อง */
function ratSpot(pos: number, k: number, count: number) {
  const row = Math.floor(k / 2);
  const side = count === 1 || (k === count - 1 && k % 2 === 0) ? 0 : k % 2 === 0 ? -1 : 1;
  const r = 352 - row * 34;
  const [x, y] = point(r, pos * STEP + side * STEP * 0.24);
  return { x: x / 10, y: y / 10 };
}

/** หนูเดินทีละช่องไปหาตำแหน่งจริง */
function useShownPositions(players: PublicPlayer[]) {
  const [shown, setShown] = useState<Record<string, number>>({});
  const target = JSON.stringify(players.map((p) => [p.id, p.pos]));
  useEffect(() => {
    const goal: [string, number][] = JSON.parse(target);
    const t = setInterval(() => {
      setShown((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [id, pos] of goal) {
          if (next[id] === undefined) {
            next[id] = pos;
            changed = true;
          } else if (next[id] !== pos) {
            next[id] = (next[id] + 1) % BOARD.length;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 280);
    return () => clearInterval(t);
  }, [target]);
  return shown;
}

export function HostScreen({ code, joinUrl, qrSvg }: { code: string; joinUrl: string; qrSvg: string }) {
  const { data, error, busy, send } = useRoom(code);
  const now = useNow();
  const state = data?.state;
  const shown = useShownPositions(state?.players ?? []);

  if (!state) return <p className="p-8 text-center text-stone-500">กำลังโหลด…</p>;

  const turnPlayer = state.players[state.turn];

  if (state.phase === "lobby") {
    return (
      <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 p-8 lg:grid-cols-2">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-stone-900">กระแสเงินสด</h1>
          <p className="mt-2 text-xl text-stone-600">สแกน QR ด้วยมือถือเพื่อเข้าเล่น</p>
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
      {/* กระดานวงกลม */}
      <div className="@container relative mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-2rem))]">
        <RingBoard />
        {/* หนูบนกระดาน (HTML ซ้อนบน SVG ขยับนุ่ม ๆ ด้วย transition) */}
        {state.players.map((p) => {
          const pos = shown[p.id] ?? p.pos;
          const same = state.players.filter((x) => (shown[x.id] ?? x.pos) === pos);
          const k = same.findIndex((x) => x.id === p.id);
          const { x, y } = ratSpot(pos, k, same.length);
          return (
            <div
              key={p.id}
              className="absolute w-[6%] -translate-x-1/2 -translate-y-1/2 drop-shadow-md transition-all duration-200"
              style={{ left: `${x}%`, top: `${y}%` }}
              title={p.name}
            >
              <Rat color={p.color} className="w-full" />
            </div>
          );
        })}

        {/* กลางวง */}
        <div className="absolute inset-[21%] flex flex-col items-center justify-center gap-[1.2cqw] overflow-hidden rounded-full bg-white p-[3.5%] text-center shadow-inner ring-1 ring-stone-200">
          {state.phase === "over" && winner ? (
            <>
              <Rat color={winner.color} className="w-[14cqw]" />
              <p className="text-[3.5cqw] font-bold" style={{ color: colorHex(winner.color) }}>
                {winner.name}
              </p>
              <p className="text-[2.4cqw] font-semibold text-emerald-700">ออกจากวงหนูวิ่งแล้ว! 🎉</p>
              <p className="text-[1.7cqw] text-stone-600">
                รายได้จากทรัพย์สิน {baht(passiveIncome(winner))} มากกว่ารายจ่าย {baht(totalExpenses(winner))}
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
                  <CardView card={state.card} big />
                </div>
              ) : (
                <p className="text-[1.9cqw] text-stone-500">
                  {state.step === "roll" && "รอทอยลูกเต๋า…"}
                  {state.step === "deal" && "เลือกดีลเล็กหรือดีลใหญ่…"}
                </p>
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
  const cf = monthlyCashflow(p);
  return (
    <div className={`card space-y-2 p-3 ${active ? "ring-2" : ""}`} style={active ? { boxShadow: `0 0 0 3px ${colorHex(p.color)}` } : undefined}>
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

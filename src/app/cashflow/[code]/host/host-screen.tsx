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

const SQUARE_STYLE: Record<Square, string> = {
  opportunity: "bg-emerald-100 text-emerald-900",
  payday: "bg-amber-200 text-amber-900",
  market: "bg-sky-100 text-sky-900",
  doodad: "bg-rose-100 text-rose-900",
  charity: "bg-violet-100 text-violet-900",
  baby: "bg-pink-100 text-pink-900",
  downsize: "bg-stone-300 text-stone-800",
};

/** ตำแหน่งช่องบนตาราง 7×7 (วนตามเข็มนาฬิกาจากมุมซ้ายบน) */
function cell(i: number) {
  if (i <= 6) return { row: 1, col: i + 1 };
  if (i <= 11) return { row: i - 5, col: 7 };
  if (i <= 18) return { row: 7, col: 7 - (i - 12) };
  return { row: 7 - (i - 18), col: 1 };
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
      {/* กระดาน */}
      <div className="mx-auto grid aspect-square w-full max-w-[min(100%,calc(100dvh-2rem))] grid-cols-7 grid-rows-7 gap-1.5">
        {BOARD.map((sq, i) => {
          const { row, col } = cell(i);
          const here = state.players.filter((p) => (shown[p.id] ?? p.pos) === i);
          return (
            <div
              key={i}
              className={`relative flex flex-col items-center justify-start overflow-hidden rounded-xl p-1 ${SQUARE_STYLE[sq]}`}
              style={{ gridRow: row, gridColumn: col }}
            >
              <span className="text-center text-[clamp(0.55rem,1.1vw,0.95rem)] leading-tight font-semibold">
                {SQUARE_LABEL[sq]}
              </span>
              <div className="flex flex-1 flex-wrap content-center items-center justify-center">
                {here.map((p) => (
                  <Rat key={p.id} color={p.color} className="w-[clamp(1.5rem,3.2vw,3rem)] drop-shadow" />
                ))}
              </div>
            </div>
          );
        })}

        {/* กลางกระดาน */}
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white p-4 text-center ring-1 ring-stone-200"
          style={{ gridRow: "2 / 7", gridColumn: "2 / 7" }}
        >
          {state.phase === "over" && winner ? (
            <>
              <Rat color={winner.color} className="w-32" />
              <p className="text-4xl font-bold" style={{ color: colorHex(winner.color) }}>
                {winner.name}
              </p>
              <p className="text-2xl font-semibold text-emerald-700">ออกจากวงหนูวิ่งแล้ว! 🎉</p>
              <p className="text-lg text-stone-600">
                รายได้จากทรัพย์สิน {baht(passiveIncome(winner))} มากกว่ารายจ่าย {baht(totalExpenses(winner))}
              </p>
            </>
          ) : (
            <>
              <p className="text-xl text-stone-500">
                ตาของ <PlayerTag p={turnPlayer} className="text-2xl" />
              </p>
              {state.dice && <Dice dice={state.dice} big />}
              {state.card ? (
                <div className="w-full max-w-xl">
                  <CardView card={state.card} big />
                </div>
              ) : (
                <p className="text-lg text-stone-500">
                  {state.step === "roll" && "รอทอยลูกเต๋า…"}
                  {state.step === "deal" && "เลือกดีลเล็กหรือดีลใหญ่…"}
                </p>
              )}
              {state.step === "respond" && (
                <div className="flex flex-wrap justify-center gap-2">
                  {waiting.map(([id, done]) => {
                    const p = state.players.find((x) => x.id === id);
                    if (!p) return null;
                    return (
                      <span key={id} className="flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1">
                        <Rat color={p.color} className="w-6" />
                        {p.name} {done ? "✓" : "กำลังเลือก…"}
                      </span>
                    );
                  })}
                  {secondsLeft !== null && <span className="px-2 py-1 text-stone-500">เหลือ {secondsLeft} วินาที</span>}
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

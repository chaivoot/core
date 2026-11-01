"use client";

import Link from "next/link";
import { useState } from "react";
import { DREAMS, FAST_GOAL, MAX_PLAYERS, MIN_PLAYERS, money, colorHex } from "@/lib/cashflow/data";
import { goalProgress, logText, TIME_LIMITS, type PublicPlayer, type PublicState } from "@/lib/cashflow/engine";
import { GameBoard } from "../board";
import { GameSummaryHeader, PlayerReportCard } from "../report";
import { IntroSlide, INTRO_SLIDES } from "../intro";
import { CardView, Dice, PlayerTag, Rat, cardKey, fmtClock, gameClock, useNow, useRoom } from "../game-ui";

type Send = ReturnType<typeof useRoom>["send"];

export function HostScreen({ code, joinUrl, qrSvg }: { code: string; joinUrl: string; qrSvg: string }) {
  const { data, error, busy, send } = useRoom(code);
  const now = useNow();
  const state = data?.state;
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
      <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 p-8 landscape:grid-cols-2">
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
          <div className="rounded-2xl bg-stone-50 p-3">
            <b>เวลาเล่น</b>
            <span className="block text-sm text-stone-500">หมดเวลาแล้วเกมจบเมื่อจบตานั้น แล้วดูสรุปผลการเล่น</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIME_LIMITS.map((m) => {
                const on = (state.options?.minutes ?? 0) === m;
                return (
                  <button
                    key={m}
                    className={`${on ? "btn-primary" : "btn-secondary"} min-h-9 px-3 text-sm`}
                    disabled={busy}
                    onClick={() => send({ type: "setOptions", minutes: m })}
                  >
                    {m === 0 ? "ไม่จำกัด" : `${m} นาที`}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-2xl bg-stone-50 p-3">
            <input
              type="checkbox"
              className="mt-1 size-5"
              checked={state.options?.resellDeals === true}
              disabled={busy}
              onChange={(e) => send({ type: "setOptions", resellDeals: e.target.checked })}
            />
            <span>
              <b>ขายสิทธิ์ดีลได้</b>
              <span className="block text-sm text-stone-500">คนเปิดดีลทรัพย์สิน/ธุรกิจที่ไม่ซื้อ ประกาศขายสิทธิ์ได้ (ค่านายหน้า 3–15% ของเงินดาวน์) ใครกดรับก่อนได้ก่อน · ไม่รวมหุ้น</span>
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
    <main className="flex min-h-dvh flex-col gap-3 p-4 landscape:h-dvh">
      <TopBar state={state} code={code} now={now} busy={busy} send={send} />
      <div className="grid gap-4 landscape:min-h-0 landscape:flex-1 landscape:grid-cols-[minmax(0,calc(100dvh-6.5rem))_minmax(15rem,1fr)] landscape:items-start">
      {data?.stale && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-4 bg-amber-100 p-3 text-amber-900 shadow">
          <span className="font-semibold">เกมมีการอัปเดตการ์ดระหว่างเล่น ห้องนี้เล่นต่อไม่ได้</span>
          <Link href="/cashflow" className="btn-primary min-h-9 px-3 text-sm">
            สร้างห้องใหม่
          </Link>
        </div>
      )}
      {/* กระดาน: ทางด่วนสี่เหลี่ยมล้อมสนามแข่งหนู */}
      <GameBoard state={state} className="mx-auto w-full max-w-[min(100%,calc(100dvh-6.5rem))]">
        {/* กลางวง */}
        <div className="absolute inset-[26.6%] flex flex-col items-center justify-center gap-[0.8cqw] overflow-hidden rounded-full bg-white p-[2%] text-center shadow-inner ring-1 ring-stone-200">
          {state.phase === "over" && !winner ? (
            <>
              <p className="text-[3cqw] font-bold text-stone-800">จบเกม</p>
              <p className="text-[1.8cqw] text-stone-500">ดูสรุปผลการเล่นของแต่ละคนด้านข้าง</p>
            </>
          ) : state.phase === "over" && winner ? (
            <>
              <Rat color={winner.color} className="w-[12cqw]" />
              <p className="text-[3.5cqw] font-bold" style={{ color: colorHex(winner.color) }}>
                {winner.name}
              </p>
              <p className="text-[2.4cqw] font-semibold text-emerald-700">ชนะเกม! 🏆</p>
              <p className="text-[1.6cqw] text-stone-600">
                {winner.fast?.dreamBought
                  ? `ซื้อความฝัน "${DREAMS[winner.fast.dream].name}" ได้แล้ว`
                  : `รายได้ต่อรอบเพิ่มขึ้นถึง ${money(FAST_GOAL)}`}
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-[0.8cqw] text-[2.2cqw] text-stone-500">
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
                <p className="text-[1.8cqw] font-semibold text-amber-700">ขายสิทธิ์ ค่านายหน้า {state.rightPct}% = {money(state.rightFee ?? 0)} ใครกดรับก่อนได้ก่อน!</p>
              )}
              {state.step === "respond" && (
                <div className="flex flex-wrap justify-center gap-[0.6cqw] text-[1.6cqw]">
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
      </GameBoard>

      {/* ผู้เล่นและบันทึก */}
      <aside className="space-y-3 landscape:max-h-[calc(100dvh-6.5rem)] landscape:max-w-[32rem] landscape:overflow-y-auto">
        {/* จบเกม: สรุปผลการเล่นทุกคน (เรียงตามความคืบหน้า) */}
        {data?.report && (
          <>
            <GameSummaryHeader report={data.report} />
            {[...data.report.players]
              .sort((a, b) => Number(b.won) - Number(a.won) || b.freedomPct - a.freedomPct)
              .map((r) => (
                <PlayerReportCard key={r.id} r={r} compact />
              ))}
          </>
        )}
        {/* เรียงจากคนที่ใกล้เป้าหมายที่สุด (คนบนทางด่วนอยู่บนสุด) */}
        {!data?.report && [...state.players]
          .sort((a, b) => progress(b) - progress(a))
          .map((p) => (
            <PlayerCard key={p.id} p={p} active={p.id === turnPlayer.id && state.phase === "playing"} />
          ))}
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <Log state={state} />
      </aside>
      </div>
    </main>
  );
}

/** แถบบนจอ host: เวลาเล่น · ผู้นำ · ขึ้นทางด่วนกี่คน · ตาของใคร · ปุ่มของ host */
function TopBar({ state, code, now, busy, send }: { state: PublicState; code: string; now: number; busy: boolean; send: Send }) {
  const clock = gameClock(state, now);
  const turnPlayer = state.players[state.turn];
  const leader = [...state.players].sort((a, b) => progress(b) - progress(a))[0];
  const fastCount = state.players.filter((p) => p.fast).length;
  const pct = clock.limit ? Math.min(100, (clock.elapsed / clock.limit) * 100) : 0;
  const low = clock.remaining !== null && clock.remaining <= 5 * 60_000;
  const tone = clock.up ? "text-rose-600" : low ? "text-amber-600" : "text-stone-900";
  const bar = clock.up ? "bg-rose-500" : low ? "bg-amber-500" : "bg-teal-600";
  return (
    <header className="card flex h-14 shrink-0 items-center gap-4 px-4 py-0">
      <div className="hidden shrink-0 leading-tight sm:block">
        <p className="font-bold">กระแสเงินสด</p>
        <p className="font-mono text-xs text-stone-500">ห้อง {code}</p>
      </div>

      {/* เวลา */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={`shrink-0 leading-tight ${tone}`}>
          <p className="text-xs text-stone-500">
            {state.phase === "over" ? "เล่นไป" : clock.up ? "หมดเวลา" : clock.remaining !== null ? "เหลือเวลา" : "เล่นมา"}
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums">
            ⏱ {fmtClock(state.phase !== "over" && clock.remaining !== null ? clock.remaining : clock.elapsed)}
          </p>
        </div>
        {clock.limit > 0 && (
          <div className="min-w-16 flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-stone-200">
              <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-0.5 truncate text-xs text-stone-500">
              {clock.up && state.phase === "playing" ? "เกมจะจบเมื่อจบตานี้" : `เวลาเล่น ${state.options?.minutes} นาที`}
            </p>
          </div>
        )}
      </div>


      {/* ผู้นำ: ใกล้เป้าหมายที่สุด (ยังไม่มีใครมีรายได้จากทรัพย์สิน = ยังไม่มีผู้นำ) */}
      <div className="hidden shrink-0 items-center gap-2 min-[1000px]:flex">
        {leader && progress(leader) > 0 ? (
          <>
            <Rat color={leader.color} className="w-9" />
            <div className="leading-tight">
              <p className="text-xs text-stone-500">ผู้นำ 👑</p>
              <p className="font-bold" style={{ color: colorHex(leader.color) }}>
                {leader.name} <span className="text-sm text-stone-500">{leader.fast ? "🚀" : `${Math.floor(progress(leader))}%`}</span>
              </p>
            </div>
          </>
        ) : (
          <div className="leading-tight">
            <p className="text-xs text-stone-500">ผู้นำ 👑</p>
            <p className="text-stone-400">ยังไม่มี</p>
          </div>
        )}
      </div>

      <div className="shrink-0 text-center leading-tight">
        <p className="text-xs text-stone-500">ขึ้นทางด่วน</p>
        <p className="text-xl font-bold">
          🚀 {fastCount}/{state.players.length}
        </p>
      </div>

      {state.phase === "playing" && (
        <>
          <div className="flex shrink-0 items-center gap-2">
            <Rat color={turnPlayer.color} className="w-10" />
            <div className="leading-tight">
              <p className="text-xs text-stone-500">ตาของ</p>
              <p className="font-bold" style={{ color: colorHex(turnPlayer.color) }}>
                {turnPlayer.name}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button className="btn-ghost min-h-9 px-2 text-sm" disabled={busy} title="ข้ามตา (กรณีค้าง)" onClick={() => send({ type: "skipTurn" })}>
              ⏭ ข้ามตา
            </button>
            <button
              className="btn min-h-9 border border-rose-300 bg-rose-50 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              disabled={busy}
              onClick={() => {
                if (window.confirm("ยุติเกมตอนนี้?\n\nทุกคนจะเล่นต่อไม่ได้ และจะเห็นสรุปผลการเล่นของตัวเองทันที")) send({ type: "finish" });
              }}
            >
              ⏹ ยุติเกม
            </button>
          </div>
        </>
      )}
    </header>
  );
}

const progress = goalProgress;

/** การ์ดผู้เล่นบนจอ host: เท่าที่จำเป็น — ชื่อ, ความคืบหน้าสู่เป้าหมาย (%) */
function PlayerCard({ p, active }: { p: PublicPlayer; active: boolean }) {
  const ring = active ? { boxShadow: `0 0 0 3px ${colorHex(p.color)}` } : undefined;
  const fast = !!p.fast;
  const pct = fast ? progress(p) - 100 : progress(p);
  return (
    <div className={`card space-y-1.5 px-3 py-2 ${fast ? "bg-indigo-950 text-indigo-50 ring-indigo-900" : ""}`} style={ring}>
      <div className="flex items-center justify-between gap-2">
        <PlayerTag p={p} />
        <span className="shrink-0 text-sm">
          {p.skip > 0 && <span className="mr-2 opacity-70">หยุด {p.skip} ตา</span>}
          {fast && "🚀 "}
          <b className="text-lg">{Math.floor(pct)}%</b>
        </span>
      </div>
      <div className={`h-2.5 overflow-hidden rounded-full ${fast ? "bg-indigo-800" : "bg-stone-200"}`}>
        <div className={`h-full rounded-full transition-all ${fast ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Log({ state }: { state: PublicState }) {
  return (
    <div className="card max-h-72 overflow-y-auto p-3 text-sm">
      <ul className="space-y-1 text-stone-700">
        {[...state.log].reverse().map((l, i) => (
          <li key={state.log.length - i} className={i === 0 ? "font-medium text-stone-900" : ""}>
            {logText(l)}
          </li>
        ))}
      </ul>
    </div>
  );
}

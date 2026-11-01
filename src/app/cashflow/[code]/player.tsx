"use client";

import { useState } from "react";
import {
  BIG_DEALS,
  COLORS,
  DREAMS,
  FAST_BUSINESSES,
  FAST_GOAL,
  DEBT_LABEL,
  LOAN_PAYMENT,
  LOAN_UNIT,
  MARKETS,
  SMALL_DEALS,
  STOCK_LABEL,
  lotOf,
  unitOf,
  money,
  colorHex,
  type Debt,
} from "@/lib/cashflow/data";
import {
  debtAmount,
  expenseLines,
  canSellRight,
  loanRoom,
  logText,
  logWho,
  monthlyCashflow,
  passiveIncome,
  profession,
  stockOf,
  totalExpenses,
  type PublicPlayer,
  type PublicState,
} from "@/lib/cashflow/engine";
import { CardView, Dice, PlayerTag, Rat, cardKey, fmtClock, gameClock, useNow, useRoom } from "./game-ui";
import { GameBoard } from "./board";
import { GameSummaryHeader, PlayerReportCard } from "./report";
import { IntroSlide } from "./intro";

type Send = ReturnType<typeof useRoom>["send"];

export function PlayerScreen({ code }: { code: string }) {
  const { data, error, busy, send, clearError } = useRoom(code);
  if (!data) {
    return <p className="p-8 text-center text-stone-500">{error ?? "กำลังโหลด…"}</p>;
  }
  const { state } = data;
  const me = state.players.find((p) => p.id === data.me);

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 pb-16">
      {data.stale && (
        <p className="rounded-xl bg-amber-100 p-3 text-sm font-medium text-amber-900">
          เกมมีการอัปเดตการ์ดระหว่างเล่น ห้องนี้เล่นต่อไม่ได้ รอ host สร้างห้องใหม่แล้วสแกน QR อีกครั้ง
        </p>
      )}
      {error && (
        <button onClick={clearError} className="w-full rounded-xl bg-rose-50 p-3 text-left text-sm text-rose-800 ring-1 ring-rose-200">
          {error} <span className="float-right">✕</span>
        </button>
      )}
      {!me ? (
        state.phase === "lobby" ? (
          <JoinForm state={state} busy={busy} send={send} />
        ) : (
          <div className="card text-center text-stone-600">เกมในห้องนี้เริ่มไปแล้ว เข้าร่วมไม่ได้</div>
        )
      ) : state.phase === "lobby" ? (
        <>
          <div className="card space-y-3 text-center">
            <Rat color={me.color} className="mx-auto w-28" />
            <p className="text-2xl font-bold" style={{ color: colorHex(me.color) }}>
              {me.name}
            </p>
            <p className="text-stone-600">เข้าห้องแล้ว รอ host กดเริ่มเกม…</p>
            <p className="text-sm text-stone-500">ตอนนี้มีผู้เล่น {state.players.length} คน</p>
          </div>
          {state.intro != null && (
            <div className="card">
              <IntroSlide index={state.intro} />
            </div>
          )}
        </>
      ) : (
        <>
          <Header me={me} state={state} />
          <BoardToggle state={state} />
          <ActionPanel state={state} me={me} busy={busy} send={send} />
          {/* จบเกม: สรุปผลการเล่นของตัวเอง */}
          {data.report?.players.find((r) => r.id === me.id) && (
            <>
              <GameSummaryHeader report={data.report} />
              <PlayerReportCard r={data.report.players.find((r) => r.id === me.id)!} />
            </>
          )}
          <MyLog state={state} me={me} />
          {me.fast ? <FastSheet me={me} /> : <Statement me={me} busy={busy} send={send} />}
        </>
      )}
    </main>
  );
}

/** ดูกระดานบนมือถือ (ปิดไว้ก่อน กดเปิด/ปิดเอง) */
function BoardToggle({ state }: { state: PublicState }) {
  const [open, setOpen] = useState(false);
  const turn = state.players[state.turn];
  return (
    <div className="space-y-2">
      <button className="btn-secondary w-full" onClick={() => setOpen((x) => !x)} aria-expanded={open}>
        {open ? "ซ่อนกระดาน" : "🗺️ ดูกระดาน"}
      </button>
      {open && (
        <GameBoard state={state} className="w-full">
          <div className="absolute inset-[26.6%] flex flex-col items-center justify-center gap-[1cqw] rounded-full bg-white text-center ring-1 ring-stone-200">
            {turn && (
              <>
                <Rat color={turn.color} className="w-[12cqw]" />
                <p className="text-[4cqw] leading-tight font-bold" style={{ color: colorHex(turn.color) }}>
                  {turn.name}
                </p>
                <p className="text-[3cqw] text-stone-500">กำลังเล่น</p>
              </>
            )}
            {state.dice && <Dice dice={state.dice} />}
          </div>
        </GameBoard>
      )}
    </div>
  );
}

function JoinForm({ state, busy, send }: { state: PublicState; busy: boolean; send: Send }) {
  const [name, setName] = useState("");
  const taken = new Set<string>(state.players.map((p) => p.color));
  const [color, setColor] = useState<string>(() => COLORS.find((c) => !taken.has(c.id))?.id ?? "");
  const chosen = taken.has(color) ? "" : color;

  return (
    <form
      className="card space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        send({ type: "join", name, color: chosen });
      }}
    >
      <h1 className="text-center text-2xl font-bold">กระแสเงินสด</h1>
      <div className="flex justify-center">
        <Rat color={chosen || "none"} className="w-28" />
      </div>
      <div>
        <label className="label" htmlFor="name">
          ชื่อของคุณ
        </label>
        <input id="name" className="input" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <span className="label">เลือกสีหนู</span>
        <div className="grid grid-cols-6 gap-2">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c.id}
              disabled={taken.has(c.id)}
              onClick={() => setColor(c.id)}
              aria-label={c.label}
              className={`aspect-square rounded-full transition disabled:opacity-20 ${chosen === c.id ? "ring-4 ring-stone-900 ring-offset-2" : ""}`}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </div>
      <button className="btn-primary w-full text-lg" disabled={busy || !name.trim() || !chosen}>
        เข้าเล่น
      </button>
    </form>
  );
}

function Header({ me, state }: { me: PublicPlayer; state: PublicState }) {
  const now = useNow();
  const clock = gameClock(state, now);
  return (
    <div className="card flex items-center gap-3">
      <Rat color={me.color} className="w-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold" style={{ color: colorHex(me.color) }}>
          {me.name}
        </p>
        <p className="text-sm text-stone-500">{me.fast ? "🚀 ทางด่วน" : profession(me).name}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-stone-500">เงินสด</p>
        <p className="text-xl font-bold">{money(me.cash)}</p>
        {state.phase === "playing" && clock.remaining !== null && (
          <p className={`font-mono text-xs tabular-nums ${clock.up ? "text-rose-600" : "text-stone-500"}`}>
            ⏱ {clock.up ? "หมดเวลา จบเมื่อจบตานี้" : `เหลือ ${fmtClock(clock.remaining)}`}
          </p>
        )}
      </div>
    </div>
  );
}

function ActionPanel({ state, me, busy, send }: { state: PublicState; me: PublicPlayer; busy: boolean; send: Send }) {
  const turn = state.players[state.turn];
  const myTurn = turn.id === me.id && state.phase === "playing";
  const now = useNow();

  if (state.phase === "over") {
    const w = state.players.find((p) => p.id === state.winner);
    return (
      <div className="card space-y-2 text-center">
        {w && <Rat color={w.color} className="mx-auto w-24" />}
        <p className="text-xl font-bold">{!w ? (state.endedBy === "time" ? "⏰ หมดเวลา เกมจบแล้ว" : "host ยุติเกมแล้ว") : w.id === me.id ? "คุณชนะเกม! 🏆" : `${w.name} ชนะเกม`}</p>
        <p className="text-sm text-stone-500">เกมจบ</p>
      </div>
    );
  }

  const mustRespond = state.step === "respond" && state.responders[me.id] === false;
  const secondsLeft = state.deadline && !myTurn ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : null;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        {myTurn ? (
          <p className="text-lg font-bold text-teal-800">ตาของคุณ</p>
        ) : (
          <p className="text-stone-600">
            ตาของ <PlayerTag p={turn} />
          </p>
        )}
        {state.dice && <Dice dice={state.dice} />}
      </div>

      {state.card && <CardView key={cardKey(state)} card={state.card} />}

      {myTurn && (me.payday ?? 0) > 0 && !me.fast && (
        <button className="btn w-full animate-pulse bg-amber-500 py-4 text-xl text-white" disabled={busy} onClick={() => send({ type: "collect" })}>
          💰 รับเงินเดือน {money(monthlyCashflow(me) * (me.payday ?? 0))}
          {(me.payday ?? 0) > 1 ? ` (${me.payday} ครั้ง)` : ""}
        </button>
      )}

      {myTurn && state.step === "roll" && (
        me.charity > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary text-lg" disabled={busy} onClick={() => send({ type: "roll", dice: 1 })}>
              ทอย 1 ลูก
            </button>
            <button className="btn-primary text-lg" disabled={busy} onClick={() => send({ type: "roll", dice: 2 })}>
              ทอย 2 ลูก
            </button>
            <p className="col-span-2 text-center text-xs text-stone-500">ทำบุญไว้ เลือกทอย 2 ลูกได้อีก {me.charity} ตา</p>
          </div>
        ) : (
          <button className="btn-primary w-full py-4 text-xl" disabled={busy} onClick={() => send({ type: "roll" })}>
            🎲 ทอยลูกเต๋า{me.fast ? " (2 ลูก)" : ""}
          </button>
        )
      )}

      {myTurn && state.step === "dream" && (
        <div className="space-y-2">
          <p className="text-center font-medium">🚀 ขึ้นทางด่วนแล้ว! เลือกความฝันของคุณ</p>
          <p className="text-center text-xs text-stone-500">
            ชนะเมื่อเดินไปตกช่องความฝันนี้แล้วมีเงินซื้อ หรือเพิ่มรายได้ต่อรอบได้ {money(FAST_GOAL)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DREAMS.map((d, i) => (
              <button
                key={d.name}
                className="flex flex-col items-center rounded-xl bg-violet-50 p-3 text-violet-900 ring-1 ring-violet-200 disabled:opacity-50"
                disabled={busy}
                onClick={() => send({ type: "chooseDream", dream: i })}
              >
                <span className="text-2xl">{d.icon}</span>
                <span className="text-sm font-semibold">{d.name}</span>
                <span className="text-xs">{money(d.cost)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {myTurn && state.step === "charity" && (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => send({ type: "charity", give: true })}>
            ทำบุญ {money(Math.round((profession(me).salary + passiveIncome(me)) * 0.1))}
          </button>
          <button className="btn-secondary" disabled={busy} onClick={() => send({ type: "charity", give: false })}>
            ไม่ทำบุญ (จบตา)
          </button>
        </div>
      )}

      {myTurn && state.step === "deal" && (
        <div className="space-y-2">
          <p className="text-center font-medium">ช่องโอกาส! เลือกเปิดการ์ด</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary flex-col py-3" disabled={busy} onClick={() => send({ type: "deal", size: "small" })}>
              ดีลเล็ก
              <span className="text-xs font-normal opacity-80">ลงทุนไม่เกิน ฿150,000</span>
            </button>
            <button className="btn flex-col bg-teal-900 py-3 text-white" disabled={busy} onClick={() => send({ type: "deal", size: "big" })}>
              ดีลใหญ่
              <span className="text-xs font-normal opacity-80">ลงทุนมากกว่า ฿150,000</span>
            </button>
          </div>
        </div>
      )}

      {mustRespond && <Respond state={state} me={me} opener={myTurn} busy={busy} send={send} />}
      {mustRespond && secondsLeft !== null && (
        <p className="text-center text-xs text-stone-500">ตอบภายใน {secondsLeft} วินาที ไม่งั้นถือว่าไม่ทำอะไร</p>
      )}

      {state.step === "respond" && !mustRespond && (
        <p className="text-center text-sm text-stone-500">
          รอ{" "}
          {Object.entries(state.responders)
            .filter(([, done]) => !done)
            .map(([id]) => state.players.find((p) => p.id === id)?.name)
            .join(", ")}{" "}
          ตัดสินใจ…
        </p>
      )}

      {myTurn && (state.step === "end" || state.step === "charity" || mustRespond) && (me.payday ?? 0) > 0 && !me.fast && monthlyCashflow(me) >= 0 && (
        <p className="text-center text-sm font-medium text-rose-600">ยังไม่ได้กดรับเงินเดือน ถ้าจบตาตอนนี้จะอดเงินเดือน</p>
      )}
      {myTurn && state.step === "end" && (
        <button className="btn-primary w-full py-3 text-lg" disabled={busy} onClick={() => send({ type: "endTurn" })}>
          จบตา
        </button>
      )}

      {!myTurn && state.step !== "respond" && <p className="text-center text-sm text-stone-400">ดูกระดานบนจอใหญ่</p>}
    </div>
  );
}

function Respond({
  state,
  me,
  opener,
  busy,
  send,
}: {
  state: PublicState;
  me: PublicPlayer;
  opener: boolean;
  busy: boolean;
  send: Send;
}) {
  const card = state.card!;

  const st = stockOf(card);
  const held = st ? (me.stocks[st.stock]?.qty ?? 0) : 0;
  const [buy, setBuy] = useState(0);
  const [sell, setSell] = useState(held);
  const [picked, setPicked] = useState<string[]>([]);

  // ทางด่วน: ซื้อธุรกิจ / ซื้อความฝัน (จ่ายสด กู้ไม่ได้)
  if (card.deck === "fastBiz" || card.deck === "dream") {
    const cost = card.deck === "fastBiz" ? FAST_BUSINESSES[card.index].cost : DREAMS[card.index].cost;
    const short = cost - me.cash;
    return (
      <div className="space-y-2">
        {short > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">เงินสดขาด {money(short)} (ทางด่วนกู้เงินไม่ได้)</p>}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-primary" disabled={busy || short > 0} onClick={() => send({ type: "respond", buy: true })}>
            {card.deck === "dream" ? "ซื้อความฝัน" : "ซื้อ"} ({money(cost)})
          </button>
          <button className="btn-secondary" disabled={busy} onClick={() => send({ type: "respond", buy: false })}>
            ไม่ซื้อ (จบตา)
          </button>
        </div>
      </div>
    );
  }

  // หุ้น/กองทุน (การ์ดดีล หรือการ์ดตลาด)
  if (st) {
    const canBuy = opener && card.deck !== "market";
    const lot = lotOf(st.stock);
    const unit = unitOf(st.stock);
    const affordable = Math.floor(me.cash / st.price / lot) * lot;
    const maxBuy = st.max ? Math.min(st.max, affordable) : affordable;
    const buyLots = Math.floor(buy / lot) * lot;
    return (
      <div className="space-y-3">
        {canBuy && (
          <div>
            <label className="label">
              ซื้อ{STOCK_LABEL[st.stock]} {lot > 1 ? `(ทีละ ${lot})` : ""} — ซื้อได้สูงสุด {maxBuy.toLocaleString("th-TH")} {unit}
            </label>
            <Stepper value={buy} step={lot} max={maxBuy} onChange={setBuy} />
            {buy % lot !== 0 && (
              <p className="mt-1 text-sm text-amber-700">
                ซื้อได้ทีละ {lot} {unit} จะซื้อ {buyLots.toLocaleString("th-TH")} {unit}
              </p>
            )}
            <p className="mt-1 text-sm text-stone-600">จ่าย {money(buyLots * st.price)}</p>
          </div>
        )}
        {held > 0 && (
          <div>
            <label className="label">
              ขายที่ {money(st.price)} — ถืออยู่ {held.toLocaleString("th-TH")} (ต้นทุนเฉลี่ย ฿
              {(me.stocks[st.stock]!.cost / held).toFixed(1)})
            </label>
            <Stepper value={sell} step={lot} max={held} onChange={setSell} />
            <p className="mt-1 text-sm text-stone-600">ได้ {money(sell * st.price)}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn-primary"
            disabled={busy || (buyLots === 0 && sell === 0)}
            onClick={() => send({ type: "respond", buy: canBuy ? buyLots : 0, sell: held > 0 ? sell : 0 })}
          >
            ยืนยัน
          </button>
          <button className="btn-secondary" disabled={busy} onClick={() => send({ type: "respond" })}>
            {canBuy ? "ไม่ซื้อ (จบตา)" : "ไม่ขาย"}
          </button>
        </div>
      </div>
    );
  }

  if (card.deck === "market") {
    const m = MARKETS[card.index];
    if (m.type !== "sellAsset") return null;
    const mine = me.assets.filter((a) => a.tag === m.tag);
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">เลือกทรัพย์สินที่จะขาย</p>
        {mine.map((a) => {
          const gross = m.multiple ? a.price * a.units * m.multiple : m.perUnit ? m.price * a.units : m.price;
          return (
            <label key={a.uid} className="flex items-start gap-3 rounded-xl bg-stone-50 p-3">
              <input
                type="checkbox"
                className="mt-1 size-5"
                checked={picked.includes(a.uid)}
                onChange={(e) => setPicked((x) => (e.target.checked ? [...x, a.uid] : x.filter((u) => u !== a.uid)))}
              />
              <span className="text-sm">
                <b>{a.name}</b>
                <br />
                ขาย {money(gross)} − จำนอง {money(a.mortgage)} = ได้เงินสด <b>{money(gross - a.mortgage)}</b>
                <br />
                <span className="text-stone-500">กระแสเงินสดที่จะหายไป {money(a.cashflow)}/เดือน</span>
              </span>
            </label>
          );
        })}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-primary" disabled={busy || picked.length === 0} onClick={() => send({ type: "respond", sellAssets: picked })}>
            ขาย
          </button>
          <button className="btn-secondary" disabled={busy} onClick={() => send({ type: "respond" })}>
            ไม่ขาย
          </button>
        </div>
      </div>
    );
  }

  // ทรัพย์สินจากการ์ดดีล (หรือการรับสิทธิ์ต่อจากคนเปิดการ์ด)
  const d = (card.deck === "small" ? SMALL_DEALS : card.deck === "big" ? BIG_DEALS : [])[card.index ?? -1];
  if (!d || d.type !== "asset") return null;
  const fee = state.resale ? (state.rightFee ?? 0) : 0;
  const total = d.down + fee;
  const short = total - me.cash;
  const loansNeeded = Math.ceil(short / LOAN_UNIT);
  const sellRightOk = opener && !state.resale && state.options?.resellDeals === true && canSellRight(d);
  return (
    <div className="space-y-2">
      {state.resale && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">
          {state.players[state.turn].name} ขายสิทธิ์ดีลนี้ ค่านายหน้า {state.rightPct}% = {money(fee)} ใครกดรับก่อนได้ก่อน!
        </p>
      )}
      {short > 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          เงินสดขาด {money(short)}
          {loansNeeded <= loanRoom(me) ? (
            <button
              className="btn-secondary mt-2 w-full"
              disabled={busy}
              onClick={() => send({ type: "loan", count: loansNeeded })}
            >
              กู้ธนาคาร {money(loansNeeded * LOAN_UNIT)} (ผ่อน {money(loansNeeded * LOAN_PAYMENT)}/เดือน)
            </button>
          ) : (
            <p className="mt-1">กู้เพิ่มได้อีกแค่ {money(loanRoom(me) * LOAN_UNIT)} ไม่พอซื้อ</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-primary" disabled={busy || short > 0} onClick={() => send({ type: "respond", buy: true })}>
          {state.resale ? `รับสิทธิ์ (${money(total)})` : `ซื้อ (${money(d.down)})`}
        </button>
        <button className="btn-secondary" disabled={busy} onClick={() => send({ type: "respond", buy: false })}>
          {state.resale ? "ไม่รับ" : "ไม่ซื้อ (จบตา)"}
        </button>
      </div>
      {state.resale && fee > 0 && (
        <p className="text-center text-xs text-stone-500">
          จ่ายค่านายหน้า {money(fee)} ให้ {state.players[state.turn].name} + เงินดาวน์ {money(d.down)}
        </p>
      )}
      {sellRightOk && <SellRight down={d.down} busy={busy} send={send} />}
    </div>
  );
}

/** คนเปิดการ์ดไม่ซื้อเอง แต่ประกาศขายสิทธิ์ เลือกค่านายหน้า 3–15% ของเงินดาวน์ */
function SellRight({ down, busy, send }: { down: number; busy: boolean; send: Send }) {
  const [pct, setPct] = useState(5);
  return (
    <div className="space-y-2 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
      <p className="text-sm font-medium">หรือขายสิทธิ์ให้คนอื่น (ใครกดรับก่อนได้ก่อน)</p>
      <label className="flex items-center gap-3 text-sm">
        <span className="shrink-0">ค่านายหน้า {pct}%</span>
        <input
          type="range"
          min={3}
          max={15}
          step={1}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="w-full accent-teal-700"
          aria-label="ค่านายหน้า (%)"
        />
      </label>
      <button className="btn-secondary w-full" disabled={busy} onClick={() => send({ type: "sellRight", pct })}>
        ประกาศขายสิทธิ์ {money(Math.round((down * pct) / 100))}
      </button>
    </div>
  );
}

/** บันทึกของฉัน: เฉพาะเหตุการณ์ที่เกี่ยวกับผู้เล่นคนนี้ ล่าสุดอยู่บน */
function MyLog({ state, me }: { state: PublicState; me: PublicPlayer }) {
  const [open, setOpen] = useState(false);
  const mine = state.log.filter((e) => logWho(e) === me.id).reverse();
  if (mine.length === 0) return null;
  const shown = open ? mine : mine.slice(0, 3);
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">บันทึกของฉัน</h2>
        <span className="text-sm text-stone-500">{mine.length} รายการ</span>
      </div>
      <ul className="space-y-1.5">
        {shown.map((e, i) => (
          <li key={mine.length - i} className={`border-l-4 pl-2 ${i === 0 ? "border-teal-600 font-medium" : "border-stone-200 text-stone-600"}`}>
            {logText(e).replace(`${me.name} `, "")}
          </li>
        ))}
      </ul>
      {mine.length > 3 && (
        <button className="btn-ghost w-full text-sm" onClick={() => setOpen((x) => !x)}>
          {open ? "ย่อ" : `ดูทั้งหมด (${mine.length})`}
        </button>
      )}
    </div>
  );
}

function Stepper({ value, step, max, onChange }: { value: number; step: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="btn-secondary w-12 text-xl" onClick={() => onChange(Math.max(0, value - step))}>
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        step={step}
        aria-label="จำนวน"
        className="input min-w-0 flex-1 text-center text-xl font-semibold tabular-nums"
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value) || 0);
          onChange(Math.min(max, Math.max(0, n)));
        }}
      />
      <button type="button" className="btn-secondary w-12 text-xl" onClick={() => onChange(Math.min(max, value + step))}>
        +
      </button>
      <button type="button" className="btn-ghost text-sm" onClick={() => onChange(max)}>
        ทั้งหมด
      </button>
    </div>
  );
}

/** แถวในแผ่นงบการเงิน: เส้นประเหมือนแบบฟอร์ม ตัวเลขเป็นลายมือ */
function Row({ label, value, strong = false, sign = false }: { label: string; value: number; strong?: boolean; sign?: boolean }) {
  return (
    <div className={`flex items-end justify-between gap-2 border-b border-dashed border-amber-300/80 py-1 ${strong ? "font-bold" : ""}`}>
      <span className="text-stone-700">{label}</span>
      <span className={`font-hand text-lg leading-none tabular-nums ${value < 0 ? "text-rose-700" : "text-blue-900"}`}>
        {sign && value > 0 ? "+" : ""}
        {money(value)}
      </span>
    </div>
  );
}

function SheetHead({ children }: { children: React.ReactNode }) {
  return <h3 className="bg-stone-800 px-2 py-0.5 text-xs font-semibold tracking-wider text-amber-50">{children}</h3>;
}

/** งบการเงินแบบแผ่นกระดาษ (เหมือนแบบฟอร์มที่ผู้เล่นกรอกเอง แต่ระบบกรอกให้) */
/** แผ่นงบการเงินบนทางด่วน */
function FastSheet({ me }: { me: PublicPlayer }) {
  const f = me.fast!;
  const gained = f.income - (f.goal - FAST_GOAL);
  const pct = Math.min(100, Math.max(0, (gained / FAST_GOAL) * 100));
  const dream = DREAMS[f.dream];
  return (
    <div className="space-y-4 rounded-sm bg-[#fffbeb] p-4 text-sm shadow-md ring-1 ring-amber-200">
      <div className="flex items-baseline justify-between border-b-2 border-stone-800 pb-1">
        <h2 className="text-base font-bold tracking-wide">งบการเงิน · ทางด่วน 🚀</h2>
        <span className="font-hand text-lg text-blue-900">{me.name}</span>
      </div>

      <div>
        <div className="flex justify-between text-xs text-stone-600">
          <span>เป้าหมาย: เพิ่มรายได้ต่อรอบ {money(FAST_GOAL)}</span>
          <span className="font-hand text-base text-blue-900">{Math.floor(pct)}%</span>
        </div>
        <div className="mt-1 h-3 overflow-hidden rounded-full bg-amber-100 ring-1 ring-amber-300">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <section>
        <SheetHead>ความฝันของฉัน</SheetHead>
        {dream ? (
          <Row label={`${dream.icon} ${dream.name}`} value={dream.cost} />
        ) : (
          <p className="py-1 text-stone-500">ยังไม่ได้เลือก (เลือกตอนถึงตา)</p>
        )}
        <p className="mt-1 text-xs text-stone-500">ตกช่องความฝันนี้แล้วมีเงินสดพอ ซื้อได้ = ชนะ</p>
      </section>

      <section>
        <SheetHead>รายได้</SheetHead>
        <Row label="รายได้ต่อรอบ (ตอนขึ้นทางด่วน)" value={f.goal - FAST_GOAL} />
        {f.businesses.map((b, i) => (
          <Row key={i} label={`+ ${b.name}`} value={b.cashflow} />
        ))}
        <Row label="รายได้ต่อรอบตอนนี้" value={f.income} strong />
        <p className="mt-1 text-xs text-stone-500">ได้ทุกครั้งที่ผ่านช่องวันรับเงิน (มุมกระดาน)</p>
      </section>

      <div className="flex items-center justify-between rounded-sm border-2 border-stone-800 bg-white px-3 py-2">
        <span className="font-bold">เงินสด</span>
        <span className="font-hand text-2xl leading-none text-emerald-700">{money(me.cash)}</span>
      </div>
    </div>
  );
}

function Statement({ me, busy, send }: { me: PublicPlayer; busy: boolean; send: Send }) {
  const pr = profession(me);
  const passive = passiveIncome(me);
  const expenses = totalExpenses(me);
  const cashflow = monthlyCashflow(me);
  const stocks = Object.entries(me.stocks);
  const pct = expenses > 0 ? Math.min(100, Math.max(0, (passive / expenses) * 100)) : 0;

  return (
    <div className="space-y-4 rounded-sm bg-[#fffbeb] p-4 text-sm shadow-md ring-1 ring-amber-200">
      <div className="flex items-baseline justify-between border-b-2 border-stone-800 pb-1">
        <h2 className="text-base font-bold tracking-wide">งบการเงิน</h2>
        <span className="font-hand text-lg text-blue-900">
          {me.name} · {pr.name}
        </span>
      </div>

      {/* หลอดอิสรภาพ */}
      <div>
        <div className="flex justify-between text-xs text-stone-600">
          <span>ทางออกจากสนามแข่งหนู</span>
          <span className="font-hand text-base text-blue-900">{Math.floor(pct)}%</span>
        </div>
        <div className="mt-1 h-3 overflow-hidden rounded-full bg-amber-100 ring-1 ring-amber-300">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-stone-500">ออกได้เมื่อรายได้จากทรัพย์สินมากกว่ารายจ่ายรวม</p>
      </div>

      <section>
        <SheetHead>รายรับต่อเดือน</SheetHead>
        <Row label="เงินเดือน" value={pr.salary} />
        <Row label="รายได้จากทรัพย์สิน" value={passive} />
        {me.assets.map((a) => (
          <div key={a.uid} className="flex justify-between gap-2 border-b border-dashed border-amber-200 py-0.5 pl-3 text-xs text-stone-500">
            <span className="truncate">· {a.name}</span>
            <span className="font-hand shrink-0 text-sm text-blue-900">{money(a.cashflow)}</span>
          </div>
        ))}
      </section>

      <section>
        <SheetHead>รายจ่ายต่อเดือน</SheetHead>
        {expenseLines(me).map((l) => (
          <Row key={l.label} label={l.label} value={l.amount} />
        ))}
        <Row label="รวมรายจ่าย" value={expenses} strong />
      </section>

      <div className="flex items-center justify-between rounded-sm border-2 border-stone-800 bg-white px-3 py-2">
        <span className="font-bold">กระแสเงินสดต่อเดือน</span>
        <span className={`font-hand text-2xl leading-none ${cashflow < 0 ? "text-rose-700" : "text-emerald-700"}`}>{money(cashflow)}</span>
      </div>

      <section>
        <SheetHead>ทรัพย์สิน</SheetHead>
        <Row label="เงินสด" value={me.cash} />
        {me.assets.map((a) => (
          <div key={a.uid} className="flex justify-between gap-2 border-b border-dashed border-amber-300/80 py-1">
            <span className="text-stone-700">{a.name}</span>
            <span className="font-hand shrink-0 text-base text-blue-900">ดาวน์ {money(a.down)}</span>
          </div>
        ))}
        {stocks.map(([k, h]) => (
          <div key={k} className="flex justify-between gap-2 border-b border-dashed border-amber-300/80 py-1">
            <span className="text-stone-700">{STOCK_LABEL[k as keyof typeof STOCK_LABEL]}</span>
            <span className="font-hand shrink-0 text-base text-blue-900">
              {h!.qty.toLocaleString("th-TH")} {unitOf(k as keyof typeof STOCK_LABEL)} · ทุน {money(h!.cost)}
            </span>
          </div>
        ))}
      </section>

      <section>
        <SheetHead>หนี้สิน</SheetHead>
        {(Object.keys(DEBT_LABEL) as Debt[]).map((d) => {
          const amount = debtAmount(me, d);
          if (amount === 0) return null;
          return (
            <div key={d} className="flex items-center justify-between gap-2 border-b border-dashed border-amber-300/80 py-1">
              <span className="text-stone-700">{DEBT_LABEL[d]}</span>
              <span className="flex items-center gap-2">
                <span className="font-hand text-lg leading-none text-blue-900">{money(amount)}</span>
                <button
                  className="rounded-md bg-white px-2 py-1 text-xs ring-1 ring-stone-300 disabled:opacity-40"
                  disabled={busy || me.cash < amount}
                  onClick={() => send({ type: "payoff", debt: d })}
                >
                  ปิดหนี้
                </button>
              </span>
            </div>
          );
        })}
        {me.assets
          .filter((a) => a.mortgage > 0)
          .map((a) => (
            <div key={a.uid} className="flex justify-between gap-2 border-b border-dashed border-amber-300/80 py-1">
              <span className="text-stone-700">จำนอง{a.name}</span>
              <span className="font-hand shrink-0 text-lg leading-none text-blue-900">{money(a.mortgage)}</span>
            </div>
          ))}
        <div className="flex items-center justify-between gap-2 border-b border-dashed border-amber-300/80 py-1">
          <span className="text-stone-700">เงินกู้ธนาคาร</span>
          <span className="flex items-center gap-1">
            <span className="font-hand mr-1 text-lg leading-none text-blue-900">{money(me.loans * LOAN_UNIT)}</span>
            <button
              className="rounded-md bg-white px-2 py-1 text-xs ring-1 ring-stone-300 disabled:opacity-40"
              disabled={busy || loanRoom(me) < 1}
              onClick={() => send({ type: "loan" })}
            >
              กู้ +{money(LOAN_UNIT)}
            </button>
            <button
              className="rounded-md bg-white px-2 py-1 text-xs ring-1 ring-stone-300 disabled:opacity-40"
              disabled={busy || me.loans < 1 || me.cash < LOAN_UNIT}
              onClick={() => send({ type: "repay" })}
            >
              คืน
            </button>
          </span>
        </div>
        <p className="mt-1 text-xs text-stone-500">กู้ได้อีก {money(loanRoom(me) * LOAN_UNIT)} (ผ่อนก้อนละ {money(LOAN_PAYMENT)}/เดือน)</p>
      </section>
    </div>
  );
}

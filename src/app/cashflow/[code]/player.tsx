"use client";

import { useState } from "react";
import {
  BIG_DEALS,
  COLORS,
  DEBT_LABEL,
  LOAN_UNIT,
  MARKETS,
  SMALL_DEALS,
  STOCK_LABEL,
  STOCK_LOT,
  baht,
  colorHex,
  type Debt,
} from "@/lib/cashflow/data";
import {
  debtAmount,
  expenseLines,
  loanRoom,
  monthlyCashflow,
  passiveIncome,
  profession,
  stockOf,
  totalExpenses,
  type PublicPlayer,
  type PublicState,
} from "@/lib/cashflow/engine";
import { CardView, Dice, FreedomBar, PlayerTag, Rat, useNow, useRoom } from "./game-ui";

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
        <div className="card space-y-3 text-center">
          <Rat color={me.color} className="mx-auto w-28" />
          <p className="text-2xl font-bold" style={{ color: colorHex(me.color) }}>
            {me.name}
          </p>
          <p className="text-stone-600">เข้าห้องแล้ว รอ host กดเริ่มเกม…</p>
          <p className="text-sm text-stone-500">ตอนนี้มีผู้เล่น {state.players.length} คน</p>
        </div>
      ) : (
        <>
          <Header me={me} />
          <ActionPanel state={state} me={me} busy={busy} send={send} />
          <Statement me={me} busy={busy} send={send} />
        </>
      )}
    </main>
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

function Header({ me }: { me: PublicPlayer }) {
  return (
    <div className="card flex items-center gap-3">
      <Rat color={me.color} className="w-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold" style={{ color: colorHex(me.color) }}>
          {me.name}
        </p>
        <p className="text-sm text-stone-500">{profession(me).name}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-stone-500">เงินสด</p>
        <p className="text-xl font-bold">{baht(me.cash)}</p>
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
        <p className="text-xl font-bold">{w?.id === me.id ? "คุณออกจากวงหนูวิ่งแล้ว! 🎉" : `${w?.name} ออกจากวงหนูวิ่งแล้ว`}</p>
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

      {state.card && <CardView card={state.card} />}

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
            🎲 ทอยลูกเต๋า
          </button>
        )
      )}

      {myTurn && state.step === "charity" && (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => send({ type: "charity", give: true })}>
            ทำบุญ {baht(Math.round((profession(me).salary + passiveIncome(me)) * 0.1))}
          </button>
          <button className="btn-secondary" disabled={busy} onClick={() => send({ type: "charity", give: false })}>
            ไม่ทำบุญ
          </button>
        </div>
      )}

      {myTurn && state.step === "deal" && (
        <div className="space-y-2">
          <p className="text-center font-medium">ช่องโอกาส! เลือกเปิดการ์ด</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary flex-col py-3" disabled={busy} onClick={() => send({ type: "deal", size: "small" })}>
              ดีลเล็ก
              <span className="text-xs font-normal opacity-80">ลงทุนไม่เกิน ฿50,000</span>
            </button>
            <button className="btn flex-col bg-teal-900 py-3 text-white" disabled={busy} onClick={() => send({ type: "deal", size: "big" })}>
              ดีลใหญ่
              <span className="text-xs font-normal opacity-80">ลงทุนมากกว่า ฿50,000</span>
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

  // หุ้น/กองทุน (การ์ดดีล หรือการ์ดตลาด)
  if (st) {
    const canBuy = opener && card.deck !== "market";
    const maxBuy = Math.floor(me.cash / st.price / STOCK_LOT) * STOCK_LOT;
    return (
      <div className="space-y-3">
        {canBuy && (
          <div>
            <label className="label">
              ซื้อ{STOCK_LABEL[st.stock]} (ทีละ {STOCK_LOT}) — ซื้อได้สูงสุด {maxBuy.toLocaleString("th-TH")}
            </label>
            <Stepper value={buy} step={STOCK_LOT} max={maxBuy} onChange={setBuy} />
            <p className="mt-1 text-sm text-stone-600">จ่าย {baht(buy * st.price)}</p>
          </div>
        )}
        {held > 0 && (
          <div>
            <label className="label">
              ขายที่ ฿{st.price} — ถืออยู่ {held.toLocaleString("th-TH")} (ต้นทุนเฉลี่ย ฿
              {(me.stocks[st.stock]!.cost / held).toFixed(1)})
            </label>
            <Stepper value={sell} step={STOCK_LOT} max={held} onChange={setSell} />
            <p className="mt-1 text-sm text-stone-600">ได้ {baht(sell * st.price)}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn-primary"
            disabled={busy || (buy === 0 && sell === 0)}
            onClick={() => send({ type: "respond", buy: canBuy ? buy : 0, sell: held > 0 ? sell : 0 })}
          >
            ยืนยัน
          </button>
          <button className="btn-secondary" disabled={busy} onClick={() => send({ type: "respond" })}>
            {canBuy ? "ไม่ซื้อ" : "ไม่ขาย"}
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
          const gross = m.perUnit ? m.price * a.units : m.price;
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
                ขาย {baht(gross)} − จำนอง {baht(a.mortgage)} = ได้เงินสด <b>{baht(gross - a.mortgage)}</b>
                <br />
                <span className="text-stone-500">กระแสเงินสดที่จะหายไป {baht(a.cashflow)}/เดือน</span>
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

  // ทรัพย์สินจากการ์ดดีล
  const d = (card.deck === "small" ? SMALL_DEALS : card.deck === "big" ? BIG_DEALS : [])[card.index ?? -1];
  if (!d || d.type !== "asset") return null;
  const short = d.down - me.cash;
  const loansNeeded = Math.ceil(short / LOAN_UNIT);
  return (
    <div className="space-y-2">
      {short > 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          เงินสดขาด {baht(short)}
          {loansNeeded <= loanRoom(me) ? (
            <button
              className="btn-secondary mt-2 w-full"
              disabled={busy}
              onClick={() => send({ type: "loan", count: loansNeeded })}
            >
              กู้ธนาคาร {baht(loansNeeded * LOAN_UNIT)} (ผ่อน {baht(loansNeeded * 1_000)}/เดือน)
            </button>
          ) : (
            <p className="mt-1">กู้เพิ่มได้อีกแค่ {baht(loanRoom(me) * LOAN_UNIT)} ไม่พอซื้อ</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-primary" disabled={busy || short > 0} onClick={() => send({ type: "respond", buy: true })}>
          ซื้อ ({baht(d.down)})
        </button>
        <button className="btn-secondary" disabled={busy} onClick={() => send({ type: "respond", buy: false })}>
          ไม่ซื้อ
        </button>
      </div>
    </div>
  );
}

function Stepper({ value, step, max, onChange }: { value: number; step: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="btn-secondary w-12 text-xl" onClick={() => onChange(Math.max(0, value - step))}>
        −
      </button>
      <span className="flex-1 text-center text-xl font-semibold tabular-nums">{value.toLocaleString("th-TH")}</span>
      <button type="button" className="btn-secondary w-12 text-xl" onClick={() => onChange(Math.min(max, value + step))}>
        +
      </button>
      <button type="button" className="btn-ghost text-sm" onClick={() => onChange(max)}>
        ทั้งหมด
      </button>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${value < 0 ? "text-rose-700" : ""}`}>{baht(value)}</span>
    </div>
  );
}

function Statement({ me, busy, send }: { me: PublicPlayer; busy: boolean; send: Send }) {
  const pr = profession(me);
  const passive = passiveIncome(me);
  const expenses = totalExpenses(me);
  const stocks = Object.entries(me.stocks);

  return (
    <div className="card space-y-4 text-sm">
      <h2 className="text-base font-bold">งบการเงินของฉัน</h2>
      <FreedomBar passive={passive} expenses={expenses} />

      <section className="space-y-1">
        <h3 className="font-semibold text-emerald-800">รายรับต่อเดือน</h3>
        <Row label="เงินเดือน" value={pr.salary} />
        <Row label="รายได้จากทรัพย์สิน" value={passive} />
      </section>

      <section className="space-y-1">
        <h3 className="font-semibold text-rose-800">รายจ่ายต่อเดือน</h3>
        {expenseLines(me).map((l) => (
          <Row key={l.label} label={l.label} value={l.amount} />
        ))}
        <Row label="รวมรายจ่าย" value={expenses} strong />
      </section>

      <div className="rounded-xl bg-teal-50 p-3 text-base">
        <Row label="กระแสเงินสดต่อเดือน" value={monthlyCashflow(me)} strong />
      </div>

      <section className="space-y-1">
        <h3 className="font-semibold">ทรัพย์สิน</h3>
        {me.assets.length === 0 && stocks.length === 0 && <p className="text-stone-500">ยังไม่มี</p>}
        {me.assets.map((a) => (
          <div key={a.uid} className="flex justify-between gap-2">
            <span>{a.name}</span>
            <span className="shrink-0 tabular-nums">{a.cashflow >= 0 ? "+" : ""}{baht(a.cashflow)}/ด.</span>
          </div>
        ))}
        {stocks.map(([k, h]) => (
          <div key={k} className="flex justify-between gap-2">
            <span>{STOCK_LABEL[k as keyof typeof STOCK_LABEL]}</span>
            <span className="shrink-0 tabular-nums">
              {h!.qty.toLocaleString("th-TH")} หุ้น (ทุน {baht(h!.cost)})
            </span>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">หนี้สิน</h3>
        {(Object.keys(DEBT_LABEL) as Debt[]).map((d) => {
          const amount = debtAmount(me, d);
          if (amount === 0) return null;
          return (
            <div key={d} className="flex items-center justify-between gap-2">
              <span>
                {DEBT_LABEL[d]} {baht(amount)}
              </span>
              <button
                className="btn-secondary min-h-9 px-3 text-sm"
                disabled={busy || me.cash < amount}
                onClick={() => send({ type: "payoff", debt: d })}
              >
                ปิดหนี้
              </button>
            </div>
          );
        })}
        {me.assets
          .filter((a) => a.mortgage > 0)
          .map((a) => (
            <div key={a.uid} className="flex justify-between gap-2 text-stone-600">
              <span>จำนอง{a.name}</span>
              <span className="tabular-nums">{baht(a.mortgage)}</span>
            </div>
          ))}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 p-2">
          <span>เงินกู้ธนาคาร {baht(me.loans * LOAN_UNIT)}</span>
          <span className="flex gap-1">
            <button
              className="btn-secondary min-h-9 px-3 text-sm"
              disabled={busy || loanRoom(me) < 1}
              onClick={() => send({ type: "loan" })}
            >
              กู้ +{baht(LOAN_UNIT)}
            </button>
            <button
              className="btn-secondary min-h-9 px-3 text-sm"
              disabled={busy || me.loans < 1 || me.cash < LOAN_UNIT}
              onClick={() => send({ type: "repay" })}
            >
              คืน
            </button>
          </span>
        </div>
        <p className="text-xs text-stone-500">กู้ได้อีก {baht(loanRoom(me) * LOAN_UNIT)} (ผ่อนก้อนละ ฿1,000/เดือน)</p>
      </section>
    </div>
  );
}

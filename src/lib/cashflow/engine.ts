// กติกาเกม "กระแสเงินสด" แบบฟังก์ชันล้วน: รับสถานะเดิม + การกระทำ → สถานะใหม่
// เซิร์ฟเวอร์เป็นคนเรียก (ทอยลูกเต๋า สับการ์ด) ผู้เล่นส่งได้แค่ "อยากทำอะไร"

import {
  BIG_DEALS,
  BOARD,
  DECK_VERSION,
  DREAMS,
  FAST_BOARD,
  FAST_BUSINESSES,
  FAST_EVENTS,
  FAST_GOAL,
  FAST_MULTIPLIER,
  COLORS,
  DEBT_LABEL,
  DEBT_MONTHS,
  DOODADS,
  LOAN_PAYMENT,
  LOAN_UNIT,
  MARKETS,
  MAX_CHILDREN,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PROFESSIONS,
  RESPONSE_SECONDS,
  SMALL_DEALS,
  STOCK_LABEL,
  lotOf,
  unitOf,
  money,
  type ColorId,
  type DealCard,
  type Debt,
  type StockKind,
} from "./data";

export type Asset = {
  uid: string;
  name: string;
  tag: string;
  price: number;
  units: number;
  down: number;
  mortgage: number;
  cashflow: number;
  rental: boolean;
};

export type Holding = { qty: number; cost: number };

export type Player = {
  id: string;
  /** ความลับใน cookie ของมือถือ - ห้ามส่งออกไปให้ใคร */
  token: string;
  name: string;
  color: ColorId;
  prof: number;
  pos: number;
  cash: number;
  children: number;
  loans: number;
  /** true = ยังผ่อนอยู่ */
  debts: Record<Debt, boolean>;
  assets: Asset[];
  stocks: Partial<Record<StockKind, Holding>>;
  /** จำนวนตาที่เลือกทอย 2 ลูกได้ (จากการทำบุญ) */
  charity: number;
  /** จำนวนตาที่ต้องหยุด (ตกงาน) */
  skip: number;
  /** อยู่ทางด่วนแล้ว (null/undefined = ยังอยู่สนามแข่งหนู) */
  fast?: FastState | null;
  /** เงินเดือนที่ยังไม่ได้กดรับ (จำนวนครั้งที่ผ่าน/ตกช่องเงินเดือนในตานี้) */
  payday?: number;
  /** พักชั่วคราว (ธุระด่วน): ข้ามตาให้เอง การ์ดที่ต้องตอบถือว่าไม่ทำอะไร */
  away?: boolean;
  /** ออกจากเกมกลางคัน (ไม่กลับมาแล้ว) */
  left?: boolean;
  /** รหัสย้ายเครื่อง (ความลับ ใช้ครั้งเดียว) */
  transfer?: string;
};

export type FastState = {
  pos: number;
  /** รายได้ต่อรอบ (ได้ทุกครั้งที่ผ่านช่องวันรับเงิน) */
  income: number;
  /** ชนะเมื่อรายได้ต่อรอบถึงเท่านี้ */
  goal: number;
  /** ความฝันที่เลือก (-1 = ยังไม่เลือก) */
  dream: number;
  businesses: { name: string; cost: number; cashflow: number }[];
  dreamBought: boolean;
};

export type Deck = "small" | "big" | "doodad" | "market";
export type Card =
  | { deck: Deck; index: number }
  | { deck: "fastBiz" | "dream" | "fastEvent"; index: number }
  | { deck: "payday" | "charity" | "baby" | "downsize" | "bankrupt" | "fastPay"; index?: undefined };

export type Step = "roll" | "charity" | "deal" | "respond" | "end" | "dream";

export type GameState = {
  phase: "lobby" | "playing" | "over";
  players: Player[];
  turn: number;
  step: Step;
  dice: number[] | null;
  /** ตำแหน่งเริ่มของตาล่าสุด ให้จอ host เดินหมากทีละช่อง */
  moveFrom: number | null;
  card: Card | null;
  /** คนที่ต้องตอบการ์ดใบนี้ true = ตอบแล้ว */
  responders: Record<string, boolean>;
  deadline: number | null;
  decks: Record<Deck, number[]>;
  log: LogEntry[];
  winner: string | null;
  seq: number;
  /** ตัวเลือกที่ host ตั้งก่อนเริ่มเกม */
  options?: GameOptions;
  /** ชุดการ์ดที่ใช้ตอนเริ่มเกม (ดู DECK_VERSION) */
  deckVersion?: string;
  /** หน้าคำอธิบายก่อนเริ่มเกมที่ host เปิดอยู่ (null = ไม่ได้เปิด) มือถือแสดงหน้าเดียวกัน */
  intro?: number | null;
  /** เหตุการณ์สำหรับวิเคราะห์ (ตัดออกก่อนส่งให้เครื่องผู้เล่น) */
  events?: GameEvent[];
  /** จำนวนครั้งที่ทอยลูกเต๋าทั้งเกม */
  rolls?: number;
  /** รหัสเกม (ใช้เก็บสรุปถาวร ห้องเดียวเล่นได้เกมเดียว) */
  gameId?: string;
  startedAt?: number;
  endedAt?: number;
  /** จบเพราะมีคนชนะ หรือ host กดจบเกม */
  endedBy?: "win" | "host" | "time";
  /** นับครั้งที่เปลี่ยนตา (ใช้ดูว่าเพิ่งจบตาไปหรือยัง) */
  turnSeq?: number;
  /** คนที่ถึงตาไม่ซื้อการ์ดใบนี้ → พอทุกคนตอบครบ จบตาให้อัตโนมัติ */
  autoEnd?: boolean;
  /** ดีลใบนี้คนเปิดไม่ซื้อ และเปิดให้คนอื่นซื้อต่อ (ใครกดก่อนได้ก่อน) */
  resale?: boolean;
  /** ค่านายหน้าที่คนเปิดการ์ดประกาศขายสิทธิ์ (บาท) */
  rightFee?: number;
  /** ค่านายหน้าเป็นกี่ % ของเงินดาวน์ */
  rightPct?: number;
};

export type GameOptions = {
  /** ดีลที่คนเปิดไม่ซื้อ ให้คนอื่นซื้อต่อได้ */
  resellDeals?: boolean;
  /** เวลาเล่น (นาที) 0/ไม่ใส่ = ไม่จำกัด · หมดเวลาแล้วเกมจบเมื่อจบตานั้น */
  minutes?: number;
};

export const TIME_LIMITS = [0, 30, 45, 60, 90, 120] as const;

/** หมดเวลาเล่นแล้วหรือยัง */
export function timeUp(s: Pick<GameState, "options" | "startedAt">, now: number) {
  const m = s.options?.minutes ?? 0;
  return m > 0 && s.startedAt !== undefined && now >= s.startedAt + m * 60_000;
}

export type LogEntry = string | { t: string; p: string };

/**
 * เหตุการณ์ที่เก็บไว้วิเคราะห์การเล่น (ไม่ส่งออกไปกับสถานะห้อง)
 * n = ลำดับการทอยทั้งเกม · v = จำนวนเงิน · cf = กระแสเงินสด/เดือน · pr = กำไร · x = ชื่อการ์ด/หุ้น
 * a = ตอนไม่ซื้อ มีเงินพอไหม (cash = เงินสดพอ, loan = ต้องกู้เพิ่มถึงพอ, no = กู้ก็ไม่พอ)
 */
export type GameEvent = {
  n: number;
  p: string;
  k:
    | "roll"
    | "deal"
    | "buyAsset"
    | "declineAsset"
    | "buyStock"
    | "declineStock"
    | "sellStock"
    | "sellAsset"
    | "sellRight"
    | "rightBuy"
    | "loan"
    | "forcedLoan"
    | "forcedSale"
    | "repay"
    | "payoff"
    | "doodad"
    | "lend"
    | "expense"
    | "downsize"
    | "baby"
    | "charity"
    | "noCharity"
    | "payday"
    | "paydayLost"
    | "fast"
    | "fastBuy"
    | "fastDecline"
    | "dream"
    | "bankrupt"
    | "win";
  v?: number;
  cf?: number;
  pr?: number;
  x?: string;
  a?: "cash" | "loan" | "no";
};

export type Action =
  | { type: "join"; name: string; color: string; token: string }
  | { type: "start" }
  | { type: "skipTurn" }
  | { type: "roll"; dice?: 1 | 2 }
  | { type: "charity"; give: boolean }
  | { type: "deal"; size: "small" | "big" }
  | { type: "respond"; buy?: number | boolean; sell?: number; sellAssets?: string[] }
  | { type: "endTurn" }
  | { type: "collect" }
  | { type: "finish" }
  /** host พัก/ปลุกผู้เล่นคนไหนก็ได้ · ผู้เล่นพัก/กลับมาเองได้ */
  | { type: "setAway"; player: string; away: boolean }
  /** host เอาผู้เล่นออกจากเกม */
  | { type: "leave"; player: string }
  /** host สร้างรหัสย้ายเครื่องให้ผู้เล่น (เซิร์ฟเวอร์สุ่ม code ให้) */
  | { type: "transfer"; player: string; code: string }
  /** เครื่องใหม่ใช้รหัสย้ายเครื่อง (เซิร์ฟเวอร์สุ่ม token ใหม่ให้) */
  | { type: "claim"; code: string; token: string }
  | { type: "chooseDream"; dream: number }
  | { type: "setOptions"; resellDeals?: boolean; minutes?: number }
  | { type: "intro"; slide: number | null }
  | { type: "sellRight"; pct: number }
  | { type: "loan"; count?: number }
  | { type: "repay" }
  | { type: "payoff"; debt: Debt };

export type Actor = { playerId?: string; host?: boolean };
export type Ctx = { now: number; rng: () => number; id: () => string };

export class GameError extends Error {}

const DECK_SIZE: Record<Deck, number> = {
  small: SMALL_DEALS.length,
  big: BIG_DEALS.length,
  doodad: DOODADS.length,
  market: MARKETS.length,
};

export function newGame(): GameState {
  return {
    phase: "lobby",
    players: [],
    turn: 0,
    step: "roll",
    dice: null,
    moveFrom: null,
    card: null,
    responders: {},
    deadline: null,
    decks: { small: [], big: [], doodad: [], market: [] },
    log: [],
    winner: null,
    seq: 0,
    options: { resellDeals: false, minutes: 60 },
    deckVersion: DECK_VERSION,
  };
}

// ---------- ตัวเลขในงบการเงิน ----------

export const profession = (p: PublicPlayer) => PROFESSIONS[p.prof];

export function passiveIncome(p: PublicPlayer) {
  return p.assets.reduce((s, a) => s + a.cashflow, 0);
}

export function expenseLines(p: PublicPlayer) {
  const pr = profession(p);
  return [
    { label: "ภาษี", amount: pr.tax },
    { label: "ผ่อนบ้าน", amount: p.debts.house ? pr.house : 0 },
    { label: "ผ่อนรถ", amount: p.debts.car ? pr.car : 0 },
    { label: "บัตรเครดิต", amount: p.debts.card ? pr.card : 0 },
    { label: "ค่าใช้จ่ายอื่น", amount: pr.other },
    { label: `ค่าเลี้ยงลูก ${p.children} คน`, amount: pr.child * p.children },
    { label: `ผ่อนเงินกู้ธนาคาร`, amount: p.loans * LOAN_PAYMENT },
  ].filter((l) => l.amount !== 0);
}

export function totalExpenses(p: PublicPlayer) {
  return expenseLines(p).reduce((s, l) => s + l.amount, 0);
}

export function monthlyCashflow(p: PublicPlayer) {
  return profession(p).salary + passiveIncome(p) - totalExpenses(p);
}

export function debtAmount(p: PublicPlayer, d: Debt) {
  return p.debts[d] ? profession(p)[d] * DEBT_MONTHS[d] : 0;
}

/** กู้เพิ่มได้อีกกี่ก้อน โดยกระแสเงินสดต่อเดือนไม่ติดลบ */
export function loanRoom(p: PublicPlayer) {
  return Math.max(0, Math.floor(monthlyCashflow(p) / LOAN_PAYMENT));
}

/** ความคืบหน้าสู่เป้าหมาย: สนามแข่งหนู 0–100 (รายได้จากทรัพย์สิน ÷ รายจ่าย) · ทางด่วน 100–200 */
export function goalProgress(p: PublicPlayer) {
  if (p.fast) {
    const gained = p.fast.income - (p.fast.goal - FAST_GOAL);
    return 100 + Math.min(100, Math.max(0, (gained / FAST_GOAL) * 100));
  }
  const expenses = totalExpenses(p);
  return expenses > 0 ? Math.min(100, (passiveIncome(p) / expenses) * 100) : 100;
}

export function isFree(p: PublicPlayer) {
  return passiveIncome(p) > totalExpenses(p);
}

export function cardFor(c: Card) {
  if (c.deck === "small") return SMALL_DEALS[c.index];
  if (c.deck === "big") return BIG_DEALS[c.index];
  return null;
}

/** ผู้เล่นตอบการ์ดหุ้นนี้ได้ไหม (คนเปิดซื้อได้ / คนถือขายได้) */
/** ขายสิทธิ์ได้เฉพาะดีลทรัพย์สิน/ธุรกิจ (ไม่รวมหุ้น กองทุน เหรียญ หุ้นกู้/เงินฝาก) */
export function canSellRight(d: DealCard | null | undefined): d is Extract<DealCard, { type: "asset" }> {
  return d?.type === "asset" && d.tag !== "cd";
}

export function stockOf(c: Card | null): { stock: StockKind; price: number; max?: number } | null {
  if (!c) return null;
  if (c.deck === "market") {
    const m = MARKETS[c.index];
    return m.type === "sellStock" ? { stock: m.stock, price: m.price } : null;
  }
  const d = cardFor(c);
  return d?.type === "stock" ? { stock: d.stock, price: d.price, max: d.max } : null;
}

// ---------- ตัวช่วย ----------

function shuffle<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function draw(s: GameState, deck: Deck, ctx: Ctx) {
  if (s.decks[deck].length === 0) {
    s.decks[deck] = shuffle(
      Array.from({ length: DECK_SIZE[deck] }, (_, i) => i),
      ctx.rng,
    );
  }
  return s.decks[deck].shift()!;
}

/** บันทึกเหตุการณ์ who = ผู้เล่นที่เกี่ยวข้อง (ใช้ทำบันทึกส่วนตัวบนมือถือ) */
function ev(s: GameState, p: { id: string }, k: GameEvent["k"], extra: Omit<GameEvent, "n" | "p" | "k"> = {}) {
  (s.events ??= []).push({ n: s.rolls ?? 0, p: p.id, k, ...extra });
}

/** ตอนตัดสินใจไม่ซื้อ มีเงินพอไหม */
function afford(p: Player, amount: number): GameEvent["a"] {
  if (p.cash >= amount) return "cash";
  return p.cash + loanRoom(p) * LOAN_UNIT >= amount ? "loan" : "no";
}

/** ชื่อการ์ดดีลไว้สรุปผล (ทรัพย์สินใส่สถานการณ์ด้วย ให้แยกใบได้) */
function dealLabel(d: DealCard) {
  if (d.type === "asset") return d.situation ? `${d.name} — ${d.situation}` : d.name;
  if (d.type === "stock") return `${STOCK_LABEL[d.stock]} ${money(d.price)}`;
  return d.text;
}

function log(s: GameState, text: string, who?: string) {
  s.log.push(who ? { t: text, p: who } : text);
  if (s.log.length > LOG_LIMIT) s.log.splice(0, s.log.length - LOG_LIMIT);
}

const LOG_LIMIT = 150;

/** ข้อความของบันทึก (ห้องเก่าเก็บเป็นข้อความล้วน) */
export const logText = (e: LogEntry) => (typeof e === "string" ? e : e.t);
export const logWho = (e: LogEntry) => (typeof e === "string" ? undefined : e.p);

function current(s: GameState) {
  return s.players[s.turn];
}

function findPlayer(s: GameState, id: string | undefined) {
  const p = s.players.find((x) => x.id === id);
  if (!p) throw new GameError("ไม่พบผู้เล่นในห้องนี้");
  return p;
}

function freshPlayer(p: Player, prof: number) {
  p.prof = prof;
  p.cash = PROFESSIONS[prof].savings;
  p.children = 0;
  p.loans = 0;
  p.debts = { house: true, car: true, card: true };
  p.assets = [];
  p.stocks = {};
  p.charity = 0;
  p.skip = 0;
  p.payday = 0;
}

/**
 * จ่ายเงินที่เลี่ยงไม่ได้ (การ์ดจ่าย ตกงาน เงินเดือนติดลบ)
 * เงินไม่พอ → กู้ให้อัตโนมัติ (ไม่ให้กระแสเงินสดติดลบ) → ขายทรัพย์สินครึ่งราคาเงินดาวน์ → ล้มละลาย
 */
function charge(s: GameState, p: Player, amount: number) {
  p.cash -= amount;
  if (p.cash >= 0) return;

  const loans = Math.min(Math.ceil(-p.cash / LOAN_UNIT), loanRoom(p));
  if (loans > 0) {
    p.loans += loans;
    p.cash += loans * LOAN_UNIT;
    ev(s, p, "forcedLoan", { v: loans * LOAN_UNIT });
    log(s, `${p.name} เงินไม่พอ กู้ธนาคาร ${money(loans * LOAN_UNIT)}`, p.id);
  }

  const forSale = [...p.assets].sort((a, b) => a.cashflow - b.cashflow);
  for (const a of forSale) {
    if (p.cash >= 0) break;
    const got = Math.floor(a.down / 2);
    p.assets = p.assets.filter((x) => x.uid !== a.uid);
    p.cash += got;
    ev(s, p, "forcedSale", { v: got, pr: got - a.down, x: a.name });
    log(s, `${p.name} เงินไม่พอ ต้องขาย${a.name} ได้ ${money(got)}`, p.id);
  }

  if (p.cash < 0) {
    ev(s, p, "bankrupt");
    freshPlayer(p, p.prof);
    log(s, `${p.name} ล้มละลาย! เริ่มต้นใหม่ด้วยอาชีพเดิม`, p.id);
    s.card = { deck: "bankrupt" };
  }
}

function payday(s: GameState, p: Player) {
  const cf = monthlyCashflow(p);
  ev(s, p, "payday", { v: cf });
  if (cf >= 0) p.cash += cf;
  else charge(s, p, -cf);
  log(s, `${p.name} รับเงินเดือน ${cf >= 0 ? "+" : ""}${money(cf)}`, p.id);
}

/** รับเงินเดือนที่ค้างไว้ทั้งหมด */
function collectPayday(s: GameState, p: Player) {
  let n = p.payday ?? 0;
  p.payday = 0;
  for (; n > 0; n--) payday(s, p);
}

/**
 * จบตาโดยไม่กดรับเงินเดือน = อด
 * ยกเว้นกระแสเงินสดติดลบ: ต้องจ่ายส่วนที่ขาดอยู่ดี (ไม่กดเพื่อหนีจ่ายไม่ได้)
 */
function forfeitPayday(s: GameState, p: Player) {
  const n = p.payday ?? 0;
  if (n <= 0) return;
  if (monthlyCashflow(p) < 0) return collectPayday(s, p);
  p.payday = 0;
  ev(s, p, "paydayLost", { v: monthlyCashflow(p) * n });
  log(s, `${p.name} ไม่ได้กดรับเงินเดือน อดเงินเดือน${n > 1 ? ` ${n} ครั้ง` : ""}`, p.id);
}

function setResponders(s: GameState, ids: string[], ctx: Ctx) {
  const live = ids.filter((id) => s.players.some((p) => p.id === id && active(p)));
  s.responders = Object.fromEntries(live.map((id) => [id, false]));
  s.deadline = ctx.now + RESPONSE_SECONDS * 1000;
  s.step = ids.length > 0 ? "respond" : "end";
}

/** ผู้เล่นที่ยังอยู่สนามแข่งหนู (การ์ดสนามแข่งหนูมีผลกับคนกลุ่มนี้เท่านั้น) */
function ratRace(s: GameState) {
  return s.players.filter((p) => !p.fast && !p.left);
}

/** ยังเล่นอยู่จริง (ไม่ได้พัก ไม่ได้ออก) — ใช้เลือกคนที่ต้องตอบการ์ด */
const active = (p: Player) => !p.away && !p.left;

function holders(s: GameState, stock: StockKind) {
  return ratRace(s).filter((p) => (p.stocks[stock]?.qty ?? 0) > 0).map((p) => p.id);
}

function startTurn(s: GameState) {
  // ข้ามคนที่ตกงาน (แต่ละรอบลดตาที่ต้องหยุดลง จึงไม่วนไม่จบ)
  for (let guard = 0; guard < s.players.length * 4; guard++) {
    const p = current(s);
    // คนที่ออกจากเกม/พักอยู่ ข้ามไปเลย (ถ้าทุกคนพักหมด หยุดที่คนนี้ รอ host ปลุก)
    if (p.left || (p.away && s.players.some((x) => active(x)))) {
      s.turn = (s.turn + 1) % s.players.length;
      continue;
    }
    if (p.skip <= 0) break;
    p.skip--;
    log(s, `${p.name} ${p.fast ? "พักรักษาตัว" : "ตกงาน"} หยุด 1 ตา`, p.id);
    s.turn = (s.turn + 1) % s.players.length;
  }
  s.step = "roll";
  s.dice = null;
  s.card = null;
  s.responders = {};
  s.deadline = null;
  s.resale = false;
  s.rightFee = undefined;
  s.rightPct = undefined;
  s.autoEnd = false;
  s.turnSeq = (s.turnSeq ?? 0) + 1;
  const p = current(s);
  if (p.fast && p.fast.dream < 0) s.step = "dream";
}

function finishCard(s: GameState) {
  if (s.step === "respond" && Object.values(s.responders).every(Boolean)) {
    s.step = "end";
    s.deadline = null;
    if (s.autoEnd) nextTurn(s);
  }
}

/** จบตาคนปัจจุบัน (เงินเดือนที่ไม่ได้กดรับ = อด) แล้วไปคนถัดไป */
function nextTurn(s: GameState) {
  forfeitPayday(s, current(s));
  s.turn = (s.turn + 1) % s.players.length;
  startTurn(s);
}

/** ขึ้นทางด่วน: เงินสดเดิม + รายได้ต่อรอบแรก */
function enterFast(s: GameState, p: Player) {
  collectPayday(s, p);
  const income = passiveIncome(p) * FAST_MULTIPLIER;
  p.fast = { pos: 0, income, goal: income + FAST_GOAL, dream: -1, businesses: [], dreamBought: false };
  ev(s, p, "fast", { v: income });
  p.cash += income;
  p.skip = 0;
  p.charity = 0;
  log(
    s,
    `🚀 ${p.name} ออกจากสนามแข่งหนู ขึ้นทางด่วน! รายได้ต่อรอบ ${money(income)} เป้าหมาย: เพิ่มอีก ${money(FAST_GOAL)} หรือซื้อความฝันของตัวเอง`,
    p.id,
  );
}

function checkWinner(s: GameState) {
  if (s.phase !== "playing") return;
  const n = s.players.length;
  for (let i = 0; i < n; i++) {
    const p = s.players[(s.turn + i) % n];
    if (!p.fast && !p.left && isFree(p)) enterFast(s, p);
  }
  for (let i = 0; i < n; i++) {
    const p = s.players[(s.turn + i) % n];
    const f = p.fast;
    if (f && !p.left && (f.dreamBought || f.income >= f.goal)) {
      s.phase = "over";
      s.winner = p.id;
      s.endedBy = "win";
      ev(s, p, "win");
      log(
        s,
        f.dreamBought
          ? `🏆 ${p.name} ซื้อความฝัน "${DREAMS[f.dream].name}" ได้แล้ว ชนะเกม!`
          : `🏆 ${p.name} เพิ่มรายได้ต่อรอบได้ ${money(FAST_GOAL)} ชนะเกม!`,
        p.id,
      );
      return;
    }
  }
}

function landFast(s: GameState, p: Player, f: FastState) {
  const sq = FAST_BOARD[f.pos];
  if (sq.type === "payday") {
    // รายได้เข้าอัตโนมัติไปแล้วตอนเดินผ่าน ไม่มีอะไรต้องตัดสินใจ จบตาเลย
    nextTurn(s);
  } else if (sq.type === "biz") {
    const b = FAST_BUSINESSES[sq.index];
    s.card = { deck: "fastBiz", index: sq.index };
    log(s, `${p.name} เจอโอกาส: ${b.name} ราคา ${money(b.cost)}`, p.id);
    s.responders = { [p.id]: false };
    s.deadline = null;
    s.step = "respond";
  } else if (sq.type === "dream") {
    s.card = { deck: "dream", index: sq.index };
    if (sq.index === f.dream) {
      s.responders = { [p.id]: false };
      s.deadline = null;
      s.step = "respond";
    } else {
      s.step = "end";
    }
  } else {
    const e = FAST_EVENTS[sq.index];
    s.card = { deck: "fastEvent", index: sq.index };
    if (e.kind === "cash") {
      const lose = Math.round(p.cash * e.pct);
      p.cash -= lose;
      log(s, `${p.name} ${e.text} (${money(lose)})`, p.id);
    } else if (e.kind === "loseBiz") {
      const worst = [...f.businesses].sort((a, b) => a.cashflow - b.cashflow)[0];
      if (worst) {
        f.businesses = f.businesses.filter((b) => b !== worst);
        f.income -= worst.cashflow;
        log(s, `${p.name} ${e.short}! เสีย${worst.name} รายได้ต่อรอบ −${money(worst.cashflow)}`, p.id);
      } else {
        log(s, `${p.name} ${e.short} แต่ยังไม่มีธุรกิจ ไม่เสียอะไร`, p.id);
      }
    } else {
      p.skip = e.turns;
      log(s, `${p.name} ${e.text}`, p.id);
    }
    s.step = "end";
  }
}

function land(s: GameState, p: Player, ctx: Ctx) {
  const square = BOARD[p.pos];
  switch (square) {
    case "opportunity":
      s.step = "deal";
      return;
    case "payday":
      s.card = { deck: "payday" };
      s.step = "end";
      return;
    case "doodad": {
      const index = draw(s, "doodad", ctx);
      const d = DOODADS[index];
      s.card = { deck: "doodad", index };
      log(s, `${p.name} จ่ายซะ: ${d.text} ${money(d.amount)}`, p.id);
      ev(s, p, "doodad", { v: d.amount, x: d.text });
      charge(s, p, d.amount);
      s.step = "end";
      return;
    }
    case "market": {
      const index = draw(s, "market", ctx);
      const m = MARKETS[index];
      s.card = { deck: "market", index };
      log(s, `ตลาด: ${m.text}`);
      if (m.type === "sellStock") return setResponders(s, holders(s, m.stock), ctx);
      if (m.type === "split") {
        // แตกพาร์/รวมพาร์: จำนวนหุ้นของทุกคนที่ถืออยู่เปลี่ยนทันที (ต้นทุนรวมเท่าเดิม)
        for (const x of ratRace(s)) {
          const h = x.stocks[m.stock];
          if (!h) continue;
          h.qty = Math.floor(h.qty * m.factor);
          if (h.qty === 0) delete x.stocks[m.stock];
          log(s, `${x.name} ${STOCK_LABEL[m.stock]} เหลือ ${h.qty.toLocaleString("th-TH")} ${unitOf(m.stock)}`, x.id);
        }
        s.step = "end";
        return;
      }
      if (m.type === "sellAsset") {
        const ids = ratRace(s).filter((x) => x.assets.some((a) => a.tag === m.tag)).map((x) => x.id);
        return setResponders(s, ids, ctx);
      }
      if (m.type === "rentUp") {
        for (const x of ratRace(s)) for (const a of x.assets) if (a.rental) a.cashflow += m.amount;
      }
      if (m.type === "cashflowUp") {
        for (const x of ratRace(s)) {
          const mine = x.assets.filter((a) => m.tags.includes(a.tag));
          for (const a of mine) a.cashflow += m.amount;
          if (mine.length > 0) log(s, `${x.name} กระแสเงินสดเพิ่ม +${money(m.amount * mine.length)}/เดือน`, x.id);
        }
      }
      if (m.type === "expense") {
        for (const x of ratRace(s)) {
          if (x.assets.some((a) => m.tags.includes(a.tag))) {
            log(s, `${x.name} จ่าย ${money(m.amount)}`, x.id);
            ev(s, x, "expense", { v: m.amount, x: m.text });
            charge(s, x, m.amount);
          }
        }
      }
      s.step = "end";
      return;
    }
    case "charity":
      s.card = { deck: "charity" };
      s.step = "charity";
      return;
    case "baby":
      s.card = { deck: "baby" };
      if (p.children < MAX_CHILDREN) {
        p.children++;
        ev(s, p, "baby", { v: profession(p).child });
        log(s, `${p.name} มีลูกเพิ่ม ค่าใช้จ่าย +${money(profession(p).child)}/เดือน`, p.id);
      } else {
        log(s, `${p.name} มีลูกครบ ${MAX_CHILDREN} คนแล้ว ไม่มีค่าใช้จ่ายเพิ่ม`, p.id);
      }
      s.step = "end";
      return;
    case "downsize":
      s.card = { deck: "downsize" };
      log(s, `${p.name} ตกงาน! จ่ายค่าใช้จ่าย 1 เดือน ${money(totalExpenses(p))} และหยุด 2 ตา`, p.id);
      ev(s, p, "downsize", { v: totalExpenses(p) });
      charge(s, p, totalExpenses(p));
      p.skip = 2;
      // ตกงาน = จบตาเลย (ไม่มีโอกาสกดรับเงินเดือนที่ผ่านมา จึงให้อัตโนมัติก่อน ไม่ถือว่าอด)
      collectPayday(s, p);
      nextTurn(s);
      return;
  }
}

function sellAsset(s: GameState, p: Player, a: Asset, unitPrice: number, perUnit: boolean, multiple?: number) {
  const gross = multiple ? a.price * a.units * multiple : perUnit ? unitPrice * a.units : unitPrice;
  const got = gross - a.mortgage;
  p.assets = p.assets.filter((x) => x.uid !== a.uid);
  p.cash += got;
  ev(s, p, "sellAsset", { v: got, pr: got - a.down, cf: a.cashflow, x: a.name });
  log(s, `${p.name} ขาย${a.name} ${money(gross)} หักจำนอง ได้เงินสด ${money(got)}`, p.id);
}

function sellStock(s: GameState, p: Player, stock: StockKind, qty: number, price: number) {
  const h = p.stocks[stock];
  if (!h || qty <= 0) return;
  if (qty > h.qty) throw new GameError("มีหุ้นไม่พอขาย");
  const soldCost = h.cost - Math.round((h.cost * (h.qty - qty)) / h.qty);
  ev(s, p, "sellStock", { v: qty * price, pr: qty * price - soldCost, x: STOCK_LABEL[stock] });
  h.cost = Math.round((h.cost * (h.qty - qty)) / h.qty);
  h.qty -= qty;
  if (h.qty === 0) delete p.stocks[stock];
  p.cash += qty * price;
  log(s, `${p.name} ขาย${STOCK_LABEL[stock]} ${qty.toLocaleString("th-TH")} ${unitOf(stock)} ที่ ${money(price)} ได้ ${money(qty * price)}`, p.id);
}

function respond(s: GameState, p: Player, a: Extract<Action, { type: "respond" }>) {
  if (s.step !== "respond" || !(p.id in s.responders)) throw new GameError("ตอนนี้ยังไม่ต้องตอบการ์ด");
  if (s.responders[p.id]) throw new GameError("ตอบการ์ดใบนี้ไปแล้ว");
  const card = s.card!;
  const opener = current(s).id === p.id;

  if (card.deck === "fastBiz" || card.deck === "dream") {
    const f = p.fast!;
    if (a.buy) {
      const item = card.deck === "fastBiz" ? FAST_BUSINESSES[card.index] : DREAMS[card.index];
      if (item.cost > p.cash) throw new GameError("เงินสดไม่พอ (ทางด่วนกู้เงินไม่ได้)");
      p.cash -= item.cost;
      if (card.deck === "fastBiz") {
        const b = FAST_BUSINESSES[card.index];
        ev(s, p, "fastBuy", { v: b.cost, cf: b.cashflow, x: b.name });
        f.businesses.push({ name: b.name, cost: b.cost, cashflow: b.cashflow });
        f.income += b.cashflow;
        log(s, `${p.name} ซื้อ${b.name} ${money(b.cost)} รายได้ต่อรอบ +${money(b.cashflow)}`, p.id);
      } else {
        f.dreamBought = true;
        ev(s, p, "dream", { v: item.cost, x: DREAMS[card.index].name });
      }
    } else {
      log(s, `${p.name} ไม่ซื้อ`, p.id);
      ev(s, p, "fastDecline", { x: card.deck === "fastBiz" ? FAST_BUSINESSES[card.index].name : DREAMS[card.index].name });
      s.autoEnd = true;
    }
    s.responders[p.id] = true;
    finishCard(s);
    return;
  }

  if (card.deck === "market") {
    const m = MARKETS[card.index];
    if (m.type === "sellStock" && a.sell) sellStock(s, p, m.stock, a.sell, m.price);
    if (m.type === "sellAsset") {
      for (const uid of a.sellAssets ?? []) {
        const asset = p.assets.find((x) => x.uid === uid && x.tag === m.tag);
        if (asset) sellAsset(s, p, asset, m.price, m.perUnit === true, m.multiple);
      }
    }
  } else {
    const d = cardFor(card)!;
    if (d.type === "stock") {
      // ขายก่อน แล้วค่อยซื้อ (เผื่ออยากเอาเงินจากการขายมาซื้อ)
      if (a.sell) sellStock(s, p, d.stock, a.sell, d.price);
      const qty = typeof a.buy === "number" ? a.buy : 0;
      if (opener && qty === 0) {
        s.autoEnd = true;
        ev(s, p, "declineStock", { v: d.price * lotOf(d.stock), x: dealLabel(d), a: afford(p, d.price * lotOf(d.stock)) });
      }
      if (qty > 0) {
        if (!opener) throw new GameError("คนเปิดการ์ดเท่านั้นที่ซื้อได้");
        const lot = lotOf(d.stock);
        if (qty % lot !== 0) throw new GameError(`ซื้อทีละ ${lot} ${unitOf(d.stock)}`);
        if (d.max && qty > d.max) throw new GameError(`มีขายแค่ ${d.max} ${unitOf(d.stock)}`);
        const cost = qty * d.price;
        if (cost > p.cash) throw new GameError("เงินสดไม่พอ (กู้ธนาคารเพิ่มได้)");
        p.cash -= cost;
        const h = (p.stocks[d.stock] ??= { qty: 0, cost: 0 });
        h.qty += qty;
        h.cost += cost;
        ev(s, p, "buyStock", { v: cost, x: dealLabel(d) });
        log(s, `${p.name} ซื้อ${STOCK_LABEL[d.stock]} ${qty.toLocaleString("th-TH")} ${unitOf(d.stock)} ที่ ${money(d.price)} (${money(cost)})`, p.id);
      }
    } else if (d.type === "asset" && a.buy) {
      const fee = s.resale ? (s.rightFee ?? 0) : 0;
      if (d.down + fee > p.cash) {
        throw new GameError(fee ? "เงินสดไม่พอจ่ายเงินดาวน์ + ค่านายหน้า (กู้ธนาคารเพิ่มได้)" : "เงินสดไม่พอจ่ายเงินดาวน์ (กู้ธนาคารเพิ่มได้)");
      }
      if (fee) {
        const seller = current(s);
        p.cash -= fee;
        seller.cash += fee;
        log(s, `${p.name} รับสิทธิ์${d.name} จ่ายค่านายหน้า ${money(fee)} ให้ ${seller.name}`, p.id);
        log(s, `${seller.name} ได้ค่านายหน้าขายสิทธิ์ ${money(fee)} จาก ${p.name}`, seller.id);
      }
      p.cash -= d.down;
      p.assets.push({
        uid: `a${++s.seq}`,
        name: d.name,
        tag: d.tag,
        price: d.price,
        units: d.units ?? 1,
        down: d.down,
        mortgage: d.mortgage,
        cashflow: d.cashflow,
        rental: d.rental === true,
      });
      log(s, `${p.name} ซื้อ${d.name} จ่าย ${money(d.down)} ได้กระแสเงินสด ${money(d.cashflow)}/เดือน`, p.id);
      ev(s, p, s.resale ? "rightBuy" : "buyAsset", { v: d.down, cf: d.cashflow, pr: fee || undefined, x: dealLabel(d) });
      if (s.resale) {
        // มีคนซื้อต่อแล้ว คนอื่นไม่ต้องตอบ
        for (const id of Object.keys(s.responders)) s.responders[id] = true;
      }
    } else if (d.type === "asset") {
      log(s, `${p.name} ไม่${s.resale ? "รับสิทธิ์" : "ซื้อ"}${d.name}`, p.id);
      if (opener) {
        s.autoEnd = true;
        ev(s, p, "declineAsset", { v: d.down, cf: d.cashflow, x: dealLabel(d), a: afford(p, d.down) });
      }
    }
  }
  s.responders[p.id] = true;
  finishCard(s);
}

/** หมดเวลาตอบ (ยกเว้นคนที่ถึงตา) → ถือว่าไม่ทำอะไร */
/** หมดเวลาแล้ว และเพิ่งเปลี่ยนตา → จบเกม (ให้คนที่กำลังเล่นอยู่เล่นจบตาก่อน) */
function endIfTimeUp(s: GameState, turnSeqBefore: number | undefined, now: number) {
  if (s.phase !== "playing" || s.turnSeq === turnSeqBefore || !timeUp(s, now)) return;
  s.phase = "over";
  s.winner = null;
  s.endedBy = "time";
  s.endedAt = now;
  log(s, "⏰ หมดเวลาเล่น จบเกม ดูสรุปผลการเล่นได้เลย");
}

export function tick(state: GameState, now: number): GameState | null {
  if (state.phase !== "playing" || state.step !== "respond" || !state.deadline || now < state.deadline) return null;
  const s = structuredClone(state);
  const turnId = current(s).id;
  for (const id of Object.keys(s.responders)) {
    if (id !== turnId) s.responders[id] = true;
  }
  s.deadline = null;
  finishCard(s);
  endIfTimeUp(s, state.turnSeq, now);
  return s;
}

export function act(state: GameState, actor: Actor, action: Action, ctx: Ctx): GameState {
  const s = structuredClone(state);

  if (action.type === "join") {
    if (s.phase !== "lobby") throw new GameError("เกมเริ่มไปแล้ว เข้าร่วมไม่ได้");
    if (s.players.length >= MAX_PLAYERS) throw new GameError(`ห้องเต็มแล้ว (${MAX_PLAYERS} คน)`);
    const name = action.name.trim().slice(0, 20);
    if (!name) throw new GameError("กรุณาใส่ชื่อ");
    const color = COLORS.find((c) => c.id === action.color)?.id;
    if (!color) throw new GameError("กรุณาเลือกสี");
    if (s.players.some((p) => p.color === color)) throw new GameError("สีนี้มีคนเลือกแล้ว");
    const p = { id: ctx.id(), token: action.token, name, color, pos: 0 } as Player;
    freshPlayer(p, 0);
    s.players.push(p);
    log(s, `${name} เข้าห้อง`, p.id);
    return s;
  }

  if (action.type === "start") {
    if (!actor.host) throw new GameError("host เท่านั้นที่เริ่มเกมได้");
    if (s.phase !== "lobby") throw new GameError("เกมเริ่มไปแล้ว");
    if (s.players.length < MIN_PLAYERS) throw new GameError(`ต้องมีผู้เล่นอย่างน้อย ${MIN_PLAYERS} คน`);
    shuffle(s.players, ctx.rng);
    const profs = shuffle(PROFESSIONS.map((_, i) => i), ctx.rng);
    s.players.forEach((p, i) => {
      freshPlayer(p, profs[i % profs.length]);
      p.pos = 0;
    });
    for (const d of Object.keys(s.decks) as Deck[]) {
      s.decks[d] = shuffle(Array.from({ length: DECK_SIZE[d] }, (_, i) => i), ctx.rng);
    }
    s.phase = "playing";
    s.deckVersion = DECK_VERSION;
    s.gameId = ctx.id() + ctx.id();
    s.startedAt = ctx.now;
    s.events = [];
    s.rolls = 0;
    s.intro = null;
    s.turn = 0;
    s.log = ["เริ่มเกม! ลำดับ: " + s.players.map((p) => `${p.name} (${profession(p).name})`).join(" → ")];
    startTurn(s);
    return s;
  }

  if (action.type === "intro") {
    if (!actor.host) throw new GameError("host เท่านั้นที่เปิดคำอธิบายได้");
    if (s.phase !== "lobby") throw new GameError("เปิดคำอธิบายได้ก่อนเริ่มเกมเท่านั้น");
    s.intro = action.slide === null ? null : Math.max(0, Math.floor(action.slide));
    return s;
  }

  if (action.type === "setOptions") {
    if (!actor.host) throw new GameError("host เท่านั้นที่ตั้งค่าได้");
    if (s.phase !== "lobby") throw new GameError("ตั้งค่าได้ก่อนเริ่มเกมเท่านั้น");
    const next = { ...s.options };
    if (action.resellDeals !== undefined) next.resellDeals = action.resellDeals;
    if (action.minutes !== undefined) {
      if (!(TIME_LIMITS as readonly number[]).includes(action.minutes)) throw new GameError("เวลาเล่นไม่ถูกต้อง");
      next.minutes = action.minutes;
    }
    s.options = next;
    return s;
  }

  if (s.phase !== "playing") throw new GameError("เกมยังไม่เริ่ม หรือจบไปแล้ว");

  if (action.type === "finish") {
    // host จบเกมก่อนมีคนชนะ (เช่น หมดเวลา) แล้วดูสรุปผล
    if (!actor.host) throw new GameError("host เท่านั้นที่จบเกมได้");
    s.phase = "over";
    s.winner = null;
    s.endedBy = "host";
    s.endedAt = ctx.now;
    log(s, "host ยุติเกม ดูสรุปผลการเล่นได้เลย");
    return s;
  }

  if (action.type === "claim") {
    const p = s.players.find((x) => x.transfer && x.transfer === action.code);
    if (!p || p.left) throw new GameError("รหัสย้ายเครื่องไม่ถูกต้อง หรือใช้ไปแล้ว");
    p.token = action.token;
    p.transfer = undefined;
    log(s, `${p.name} ย้ายมาเล่นบนเครื่องใหม่`, p.id);
    return s;
  }

  if (action.type === "transfer") {
    if (!actor.host) throw new GameError("host เท่านั้นที่ย้ายเครื่องให้ผู้เล่นได้");
    const p = findPlayer(s, action.player);
    if (p.left) throw new GameError("ผู้เล่นคนนี้ออกจากเกมแล้ว");
    p.transfer = action.code;
    return s;
  }

  if (action.type === "setAway" || action.type === "leave") {
    const p = findPlayer(s, action.player);
    const self = actor.playerId === p.id;
    if (!actor.host && !(self && action.type === "setAway")) throw new GameError("host เท่านั้นที่ทำได้");
    if (p.left) throw new GameError("ผู้เล่นคนนี้ออกจากเกมแล้ว");
    if (action.type === "setAway" && !action.away) {
      p.away = false;
      log(s, `${p.name} กลับมาเล่นแล้ว`, p.id);
      return s;
    }
    if (action.type === "setAway") {
      p.away = true;
      log(s, `⏸ ${p.name} พักชั่วคราว (ถึงตาจะข้ามให้)`, p.id);
    } else {
      p.left = true;
      p.away = false;
      p.transfer = undefined;
      log(s, `🚪 ${p.name} ออกจากเกม`, p.id);
    }
    // การ์ดที่รอคนนี้ตอบอยู่ ถือว่าไม่ทำอะไร
    if (s.step === "respond" && s.responders[p.id] === false && current(s).id !== p.id) {
      s.responders[p.id] = true;
      finishCard(s);
    }
    // กำลังเป็นตาของคนนี้ → ไปคนถัดไป
    if (current(s).id === p.id) {
      collectPayday(s, p);
      s.autoEnd = false;
      nextTurn(s);
    }
    // เหลือผู้เล่นไม่ถึง 2 คน → จบเกม
    if (s.players.filter((x) => !x.left).length < 2) {
      s.phase = "over";
      s.winner = null;
      s.endedBy = "host";
      s.endedAt = ctx.now;
      log(s, "เหลือผู้เล่นไม่ถึง 2 คน จบเกม ดูสรุปผลการเล่นได้เลย");
    }
    return s;
  }

  if (action.type === "skipTurn") {
    if (!actor.host) throw new GameError("host เท่านั้นที่ข้ามตาได้");
    log(s, `host ข้ามตาของ ${current(s).name}`, current(s).id);
    nextTurn(s);
    return s;
  }

  const p = findPlayer(s, actor.playerId);
  const myTurn = current(s).id === p.id;

  if (p.fast && (action.type === "loan" || action.type === "repay" || action.type === "payoff")) {
    throw new GameError("อยู่ทางด่วนแล้ว ไม่ต้องใช้เงินกู้หรือปิดหนี้");
  }

  switch (action.type) {
    case "chooseDream":
      if (!myTurn || s.step !== "dream" || !p.fast) throw new GameError("ตอนนี้เลือกความฝันไม่ได้");
      if (!DREAMS[action.dream]) throw new GameError("ไม่พบความฝันนี้");
      p.fast.dream = action.dream;
      s.step = "roll";
      log(s, `${p.name} เลือกความฝัน: ${DREAMS[action.dream].name} (${money(DREAMS[action.dream].cost)})`, p.id);
      break;
    case "loan": {
      const n = Math.max(1, Math.floor(action.count ?? 1));
      if (n > loanRoom(p)) throw new GameError("กู้เพิ่มไม่ได้ กระแสเงินสดต่อเดือนจะติดลบ");
      p.loans += n;
      p.cash += n * LOAN_UNIT;
      ev(s, p, "loan", { v: n * LOAN_UNIT });
      log(s, `${p.name} กู้ธนาคาร ${money(n * LOAN_UNIT)}`, p.id);
      break;
    }
    case "repay":
      if (p.loans <= 0) throw new GameError("ไม่มีเงินกู้ธนาคาร");
      if (p.cash < LOAN_UNIT) throw new GameError("เงินสดไม่พอ");
      p.loans--;
      p.cash -= LOAN_UNIT;
      ev(s, p, "repay", { v: LOAN_UNIT });
      log(s, `${p.name} คืนเงินกู้ ${money(LOAN_UNIT)}`, p.id);
      break;
    case "payoff": {
      const amount = debtAmount(p, action.debt);
      if (amount <= 0) throw new GameError("ปิดหนี้นี้ไปแล้ว");
      if (p.cash < amount) throw new GameError("เงินสดไม่พอ");
      p.cash -= amount;
      p.debts[action.debt] = false;
      ev(s, p, "payoff", { v: amount, cf: profession(p)[action.debt], x: DEBT_LABEL[action.debt] });
      log(s, `${p.name} ปิดหนี้${DEBT_LABEL[action.debt]} ${money(amount)}`, p.id);
      break;
    }
    case "roll": {
      if (!myTurn || s.step !== "roll") throw new GameError("ยังไม่ถึงตาทอยลูกเต๋า");
      s.rolls = (s.rolls ?? 0) + 1;
      ev(s, p, "roll", { x: p.fast ? "fast" : undefined });
      if (p.fast) {
        // ทางด่วนทอย 2 ลูกเสมอ ผ่านวันรับเงินได้รายได้ต่อรอบ
        const f = p.fast;
        s.dice = [1 + Math.floor(ctx.rng() * 6), 1 + Math.floor(ctx.rng() * 6)];
        for (let i = 0; i < s.dice[0] + s.dice[1]; i++) {
          f.pos = (f.pos + 1) % FAST_BOARD.length;
          if (FAST_BOARD[f.pos].type === "payday") {
            p.cash += f.income;
            log(s, `${p.name} วันรับเงิน +${money(f.income)}`, p.id);
          }
        }
        landFast(s, p, f);
        break;
      }
      const n = action.dice === 2 && p.charity > 0 ? 2 : 1;
      if (p.charity > 0) p.charity--;
      s.dice = Array.from({ length: n }, () => 1 + Math.floor(ctx.rng() * 6));
      const steps = s.dice.reduce((a, b) => a + b, 0);
      s.moveFrom = p.pos;
      for (let i = 0; i < steps; i++) {
        p.pos = (p.pos + 1) % BOARD.length;
        // ผ่านหรือตกช่องเงินเดือน: ได้เงินเดือน แต่ต้องกดปุ่มรับเอง
        if (BOARD[p.pos] === "payday") p.payday = (p.payday ?? 0) + 1;
      }
      if (p.payday) log(s, `${p.name} ผ่านช่องเงินเดือน กดรับเงินเดือนได้`, p.id);
      land(s, p, ctx);
      break;
    }
    case "charity": {
      if (!myTurn || s.step !== "charity") throw new GameError("ตอนนี้ทำบุญไม่ได้");
      if (action.give) {
        const amount = Math.round((profession(p).salary + passiveIncome(p)) * 0.1);
        if (p.cash < amount) throw new GameError("เงินสดไม่พอ");
        p.cash -= amount;
        p.charity = 3;
        ev(s, p, "charity", { v: amount });
        log(s, `${p.name} ทำบุญ ${money(amount)} เลือกทอย 2 ลูกได้ 3 ตา`, p.id);
      } else {
        log(s, `${p.name} ไม่ทำบุญ`, p.id);
        ev(s, p, "noCharity");
        // ไม่ทำบุญ = จบตาเลย
        nextTurn(s);
        break;
      }
      s.step = "end";
      break;
    }
    case "deal": {
      if (!myTurn || s.step !== "deal") throw new GameError("ตอนนี้เปิดดีลไม่ได้");
      const index = draw(s, action.size, ctx);
      s.card = { deck: action.size, index };
      s.resale = false;
      const d: DealCard = (action.size === "small" ? SMALL_DEALS : BIG_DEALS)[index];
      ev(s, p, "deal", { x: action.size });
      if (d.type === "split") {
        for (const x of s.players) {
          const h = x.stocks[d.stock];
          if (h) {
            h.qty = Math.floor(h.qty * d.factor);
            if (h.qty === 0) delete x.stocks[d.stock];
          }
        }
        log(s, d.text);
        s.step = "end";
      } else if (d.type === "lend") {
        // ต้องจ่ายทันที เหมือนการ์ดจ่ายซะ แต่มาจากกองดีลเล็ก
        log(s, `${p.name} ${d.text}`, p.id);
        ev(s, p, "lend", { v: d.amount, x: d.text });
        charge(s, p, d.amount);
        s.step = "end";
      } else if (d.type === "stock") {
        log(s, `${p.name} เปิดการ์ด ${d.text ?? `${STOCK_LABEL[d.stock]} ราคา ${money(d.price)}`}`, p.id);
        setResponders(s, [p.id, ...holders(s, d.stock).filter((id) => id !== p.id)], ctx);
      } else {
        log(s, `${p.name} เปิดการ์ด ${d.name}`, p.id);
        setResponders(s, [p.id], ctx);
      }
      break;
    }
    case "respond":
      respond(s, p, action);
      break;
    case "sellRight": {
      // คนเปิดการ์ดไม่ซื้อ แต่ประกาศขายสิทธิ์ (ค่านายหน้า 3–15% ของเงินดาวน์) ให้คนแรกที่กดรับ
      const d = s.card ? cardFor(s.card) : null;
      if (!myTurn || s.step !== "respond" || s.resale || s.responders[p.id] !== false || !canSellRight(d)) {
        throw new GameError("ขายสิทธิ์ได้เฉพาะดีลทรัพย์สินหรือธุรกิจ");
      }
      if (!s.options?.resellDeals) throw new GameError("ห้องนี้ไม่ได้เปิดให้ขายสิทธิ์ดีล");
      const pct = Math.round(action.pct);
      if (pct < 3 || pct > 15) throw new GameError("ค่านายหน้าต้องอยู่ระหว่าง 3% ถึง 15%");
      const others = ratRace(s).filter((x) => x.id !== p.id).map((x) => x.id);
      if (others.length === 0) throw new GameError("ไม่มีผู้เล่นคนอื่นรับสิทธิ์ได้");
      s.resale = true;
      s.autoEnd = true;
      s.rightPct = pct;
      s.rightFee = Math.round((d.down * pct) / 100);
      ev(s, p, "sellRight", { v: s.rightFee, x: dealLabel(d) });
      log(s, `${p.name} ขายสิทธิ์${d.name} ค่านายหน้า ${pct}% = ${money(s.rightFee)} (ใครกดรับก่อนได้ก่อน)`, p.id);
      setResponders(s, others, ctx);
      break;
    }
    case "collect":
      if (!myTurn || !p.payday) throw new GameError("ไม่มีเงินเดือนให้รับ");
      collectPayday(s, p);
      break;
    case "endTurn":
      if (!myTurn || s.step !== "end") throw new GameError("ยังจบตาไม่ได้");
      nextTurn(s);
      break;
  }

  checkWinner(s);
  endIfTimeUp(s, state.turnSeq, ctx.now);
  if ((s.phase as GameState["phase"]) === "over" && !s.endedAt) s.endedAt = ctx.now;
  return s;
}

/** ส่งให้มือถือ/จอ host - ตัดความลับออก */
export type PublicPlayer = Omit<Player, "token" | "transfer">;
export type PublicState = Omit<GameState, "players" | "decks" | "events"> & {
  players: PublicPlayer[];
  /** เหลือการ์ดในกองกี่ใบ (ไม่ส่งลำดับการ์ดออกไป) */
  deckLeft: Record<Deck, number>;
};

export function publicState(s: GameState): PublicState {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- เหตุการณ์ใช้วิเคราะห์ฝั่งเซิร์ฟเวอร์เท่านั้น
  const { decks, players, events, ...rest } = s;
  return {
    ...rest,
    deckLeft: { small: decks.small.length, big: decks.big.length, doodad: decks.doodad.length, market: decks.market.length },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ตัด token และรหัสย้ายเครื่องออก
    players: players.map(({ token, transfer, ...p }) => p),
  };
}

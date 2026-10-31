// กติกาเกม "กระแสเงินสด" แบบฟังก์ชันล้วน: รับสถานะเดิม + การกระทำ → สถานะใหม่
// เซิร์ฟเวอร์เป็นคนเรียก (ทอยลูกเต๋า สับการ์ด) ผู้เล่นส่งได้แค่ "อยากทำอะไร"

import {
  BIG_DEALS,
  BOARD,
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
  STOCK_LOT,
  baht,
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
  /** อยู่ทางด่วนแล้ว (null/undefined = ยังอยู่วงหนูวิ่ง) */
  fast?: FastState | null;
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
  log: string[];
  winner: string | null;
  seq: number;
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
  | { type: "chooseDream"; dream: number }
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

export function isFree(p: PublicPlayer) {
  return passiveIncome(p) > totalExpenses(p);
}

export function cardFor(c: Card) {
  if (c.deck === "small") return SMALL_DEALS[c.index];
  if (c.deck === "big") return BIG_DEALS[c.index];
  return null;
}

/** ผู้เล่นตอบการ์ดหุ้นนี้ได้ไหม (คนเปิดซื้อได้ / คนถือขายได้) */
export function stockOf(c: Card | null): { stock: StockKind; price: number } | null {
  if (!c) return null;
  if (c.deck === "market") {
    const m = MARKETS[c.index];
    return m.type === "sellStock" ? { stock: m.stock, price: m.price } : null;
  }
  const d = cardFor(c);
  return d?.type === "stock" ? { stock: d.stock, price: d.price } : null;
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

function log(s: GameState, text: string) {
  s.log.push(text);
  if (s.log.length > 40) s.log.splice(0, s.log.length - 40);
}

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
    log(s, `${p.name} เงินไม่พอ กู้ธนาคาร ${baht(loans * LOAN_UNIT)}`);
  }

  const forSale = [...p.assets].sort((a, b) => a.cashflow - b.cashflow);
  for (const a of forSale) {
    if (p.cash >= 0) break;
    const got = Math.floor(a.down / 2);
    p.assets = p.assets.filter((x) => x.uid !== a.uid);
    p.cash += got;
    log(s, `${p.name} เงินไม่พอ ต้องขาย${a.name} ได้ ${baht(got)}`);
  }

  if (p.cash < 0) {
    freshPlayer(p, p.prof);
    log(s, `${p.name} ล้มละลาย! เริ่มต้นใหม่ด้วยอาชีพเดิม`);
    s.card = { deck: "bankrupt" };
  }
}

function payday(s: GameState, p: Player) {
  const cf = monthlyCashflow(p);
  if (cf >= 0) p.cash += cf;
  else charge(s, p, -cf);
  log(s, `${p.name} เงินเดือนออก ${cf >= 0 ? "+" : ""}${baht(cf)}`);
}

function setResponders(s: GameState, ids: string[], ctx: Ctx) {
  s.responders = Object.fromEntries(ids.map((id) => [id, false]));
  s.deadline = ctx.now + RESPONSE_SECONDS * 1000;
  s.step = ids.length > 0 ? "respond" : "end";
}

/** ผู้เล่นที่ยังอยู่วงหนูวิ่ง (การ์ดวงหนูวิ่งมีผลกับคนกลุ่มนี้เท่านั้น) */
function ratRace(s: GameState) {
  return s.players.filter((p) => !p.fast);
}

function holders(s: GameState, stock: StockKind) {
  return ratRace(s).filter((p) => (p.stocks[stock]?.qty ?? 0) > 0).map((p) => p.id);
}

function startTurn(s: GameState) {
  // ข้ามคนที่ตกงาน (แต่ละรอบลดตาที่ต้องหยุดลง จึงไม่วนไม่จบ)
  for (let guard = 0; guard < s.players.length * 3; guard++) {
    const p = current(s);
    if (p.skip <= 0) break;
    p.skip--;
    log(s, `${p.name} ${p.fast ? "พักรักษาตัว" : "ตกงาน"} หยุด 1 ตา`);
    s.turn = (s.turn + 1) % s.players.length;
  }
  s.step = "roll";
  s.dice = null;
  s.card = null;
  s.responders = {};
  s.deadline = null;
  const p = current(s);
  if (p.fast && p.fast.dream < 0) s.step = "dream";
}

function finishCard(s: GameState) {
  if (s.step === "respond" && Object.values(s.responders).every(Boolean)) {
    s.step = "end";
    s.deadline = null;
  }
}

/** ขึ้นทางด่วน: เงินสดเดิม + รายได้ต่อรอบแรก */
function enterFast(s: GameState, p: Player) {
  const income = passiveIncome(p) * FAST_MULTIPLIER;
  p.fast = { pos: 0, income, goal: income + FAST_GOAL, dream: -1, businesses: [], dreamBought: false };
  p.cash += income;
  p.skip = 0;
  p.charity = 0;
  log(
    s,
    `🚀 ${p.name} ออกจากวงหนูวิ่ง ขึ้นทางด่วน! รายได้ต่อรอบ ${baht(income)} เป้าหมาย: เพิ่มอีก ${baht(FAST_GOAL)} หรือซื้อความฝันของตัวเอง`,
  );
}

function checkWinner(s: GameState) {
  if (s.phase !== "playing") return;
  const n = s.players.length;
  for (let i = 0; i < n; i++) {
    const p = s.players[(s.turn + i) % n];
    if (!p.fast && isFree(p)) enterFast(s, p);
  }
  for (let i = 0; i < n; i++) {
    const p = s.players[(s.turn + i) % n];
    const f = p.fast;
    if (f && (f.dreamBought || f.income >= f.goal)) {
      s.phase = "over";
      s.winner = p.id;
      log(
        s,
        f.dreamBought
          ? `🏆 ${p.name} ซื้อความฝัน "${DREAMS[f.dream].name}" ได้แล้ว ชนะเกม!`
          : `🏆 ${p.name} เพิ่มรายได้ต่อรอบได้ ${baht(FAST_GOAL)} ชนะเกม!`,
      );
      return;
    }
  }
}

function landFast(s: GameState, p: Player, f: FastState) {
  const sq = FAST_BOARD[f.pos];
  if (sq.type === "payday") {
    s.card = { deck: "fastPay" };
    s.step = "end";
  } else if (sq.type === "biz") {
    const b = FAST_BUSINESSES[sq.index];
    s.card = { deck: "fastBiz", index: sq.index };
    log(s, `${p.name} เจอโอกาส: ${b.name} ราคา ${baht(b.cost)}`);
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
      log(s, `${p.name} ${e.text} (${baht(lose)})`);
    } else if (e.kind === "loseBiz") {
      const worst = [...f.businesses].sort((a, b) => a.cashflow - b.cashflow)[0];
      if (worst) {
        f.businesses = f.businesses.filter((b) => b !== worst);
        f.income -= worst.cashflow;
        log(s, `${p.name} ${e.short}! เสีย${worst.name} รายได้ต่อรอบ −${baht(worst.cashflow)}`);
      } else {
        log(s, `${p.name} ${e.short} แต่ยังไม่มีธุรกิจ ไม่เสียอะไร`);
      }
    } else {
      p.skip = e.turns;
      log(s, `${p.name} ${e.text}`);
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
      log(s, `${p.name} จ่ายไม่คาดฝัน: ${d.text} ${baht(d.amount)}`);
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
      if (m.type === "sellAsset") {
        const ids = ratRace(s).filter((x) => x.assets.some((a) => a.tag === m.tag)).map((x) => x.id);
        return setResponders(s, ids, ctx);
      }
      if (m.type === "rentUp") {
        for (const x of ratRace(s)) for (const a of x.assets) if (a.rental) a.cashflow += m.amount;
      }
      if (m.type === "expense") {
        for (const x of ratRace(s)) {
          if (x.assets.some((a) => m.tags.includes(a.tag))) {
            log(s, `${x.name} จ่าย ${baht(m.amount)}`);
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
        log(s, `${p.name} มีลูกเพิ่ม ค่าใช้จ่าย +${baht(profession(p).child)}/เดือน`);
      } else {
        log(s, `${p.name} มีลูกครบ ${MAX_CHILDREN} คนแล้ว ไม่มีค่าใช้จ่ายเพิ่ม`);
      }
      s.step = "end";
      return;
    case "downsize":
      s.card = { deck: "downsize" };
      log(s, `${p.name} ตกงาน! จ่ายค่าใช้จ่าย 1 เดือน ${baht(totalExpenses(p))} และหยุด 2 ตา`);
      charge(s, p, totalExpenses(p));
      p.skip = 2;
      s.step = "end";
      return;
  }
}

function sellAsset(s: GameState, p: Player, a: Asset, unitPrice: number, perUnit: boolean) {
  const gross = perUnit ? unitPrice * a.units : unitPrice;
  const got = gross - a.mortgage;
  p.assets = p.assets.filter((x) => x.uid !== a.uid);
  p.cash += got;
  log(s, `${p.name} ขาย${a.name} ${baht(gross)} หักจำนอง ได้เงินสด ${baht(got)}`);
}

function sellStock(s: GameState, p: Player, stock: StockKind, qty: number, price: number) {
  const h = p.stocks[stock];
  if (!h || qty <= 0) return;
  if (qty > h.qty) throw new GameError("มีหุ้นไม่พอขาย");
  h.cost = Math.round((h.cost * (h.qty - qty)) / h.qty);
  h.qty -= qty;
  if (h.qty === 0) delete p.stocks[stock];
  p.cash += qty * price;
  log(s, `${p.name} ขาย${STOCK_LABEL[stock]} ${qty.toLocaleString("th-TH")} หุ้น ที่ ฿${price} ได้ ${baht(qty * price)}`);
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
        f.businesses.push({ name: b.name, cost: b.cost, cashflow: b.cashflow });
        f.income += b.cashflow;
        log(s, `${p.name} ซื้อ${b.name} ${baht(b.cost)} รายได้ต่อรอบ +${baht(b.cashflow)}`);
      } else {
        f.dreamBought = true;
      }
    } else {
      log(s, `${p.name} ไม่ซื้อ`);
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
        if (asset) sellAsset(s, p, asset, m.price, m.perUnit === true);
      }
    }
  } else {
    const d = cardFor(card)!;
    if (d.type === "stock") {
      // ขายก่อน แล้วค่อยซื้อ (เผื่ออยากเอาเงินจากการขายมาซื้อ)
      if (a.sell) sellStock(s, p, d.stock, a.sell, d.price);
      const qty = typeof a.buy === "number" ? a.buy : 0;
      if (qty > 0) {
        if (!opener) throw new GameError("คนเปิดการ์ดเท่านั้นที่ซื้อได้");
        if (qty % STOCK_LOT !== 0) throw new GameError(`ซื้อทีละ ${STOCK_LOT} หุ้น`);
        const cost = qty * d.price;
        if (cost > p.cash) throw new GameError("เงินสดไม่พอ (กู้ธนาคารเพิ่มได้)");
        p.cash -= cost;
        const h = (p.stocks[d.stock] ??= { qty: 0, cost: 0 });
        h.qty += qty;
        h.cost += cost;
        log(s, `${p.name} ซื้อ${STOCK_LABEL[d.stock]} ${qty.toLocaleString("th-TH")} หุ้น ที่ ฿${d.price} (${baht(cost)})`);
      }
    } else if (d.type === "asset" && a.buy) {
      if (d.down > p.cash) throw new GameError("เงินสดไม่พอจ่ายเงินดาวน์ (กู้ธนาคารเพิ่มได้)");
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
      log(s, `${p.name} ซื้อ${d.name} จ่าย ${baht(d.down)} ได้กระแสเงินสด ${baht(d.cashflow)}/เดือน`);
    } else if (d.type === "asset") {
      log(s, `${p.name} ไม่ซื้อ${d.name}`);
    }
  }
  s.responders[p.id] = true;
  finishCard(s);
}

/** หมดเวลาตอบ (ยกเว้นคนที่ถึงตา) → ถือว่าไม่ทำอะไร */
export function tick(state: GameState, now: number): GameState | null {
  if (state.phase !== "playing" || state.step !== "respond" || !state.deadline || now < state.deadline) return null;
  const s = structuredClone(state);
  const turnId = current(s).id;
  for (const id of Object.keys(s.responders)) {
    if (id !== turnId) s.responders[id] = true;
  }
  s.deadline = null;
  finishCard(s);
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
    log(s, `${name} เข้าห้อง`);
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
    s.turn = 0;
    s.log = ["เริ่มเกม! ลำดับ: " + s.players.map((p) => `${p.name} (${profession(p).name})`).join(" → ")];
    startTurn(s);
    return s;
  }

  if (s.phase !== "playing") throw new GameError("เกมยังไม่เริ่ม หรือจบไปแล้ว");

  if (action.type === "skipTurn") {
    if (!actor.host) throw new GameError("host เท่านั้นที่ข้ามตาได้");
    log(s, `host ข้ามตาของ ${current(s).name}`);
    s.turn = (s.turn + 1) % s.players.length;
    startTurn(s);
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
      log(s, `${p.name} เลือกความฝัน: ${DREAMS[action.dream].name} (${baht(DREAMS[action.dream].cost)})`);
      break;
    case "loan": {
      const n = Math.max(1, Math.floor(action.count ?? 1));
      if (n > loanRoom(p)) throw new GameError("กู้เพิ่มไม่ได้ กระแสเงินสดต่อเดือนจะติดลบ");
      p.loans += n;
      p.cash += n * LOAN_UNIT;
      log(s, `${p.name} กู้ธนาคาร ${baht(n * LOAN_UNIT)}`);
      break;
    }
    case "repay":
      if (p.loans <= 0) throw new GameError("ไม่มีเงินกู้ธนาคาร");
      if (p.cash < LOAN_UNIT) throw new GameError("เงินสดไม่พอ");
      p.loans--;
      p.cash -= LOAN_UNIT;
      log(s, `${p.name} คืนเงินกู้ ${baht(LOAN_UNIT)}`);
      break;
    case "payoff": {
      const amount = debtAmount(p, action.debt);
      if (amount <= 0) throw new GameError("ปิดหนี้นี้ไปแล้ว");
      if (p.cash < amount) throw new GameError("เงินสดไม่พอ");
      p.cash -= amount;
      p.debts[action.debt] = false;
      log(s, `${p.name} ปิดหนี้${DEBT_LABEL[action.debt]} ${baht(amount)}`);
      break;
    }
    case "roll": {
      if (!myTurn || s.step !== "roll") throw new GameError("ยังไม่ถึงตาทอยลูกเต๋า");
      if (p.fast) {
        // ทางด่วนทอย 2 ลูกเสมอ ผ่านวันรับเงินได้รายได้ต่อรอบ
        const f = p.fast;
        s.dice = [1 + Math.floor(ctx.rng() * 6), 1 + Math.floor(ctx.rng() * 6)];
        for (let i = 0; i < s.dice[0] + s.dice[1]; i++) {
          f.pos = (f.pos + 1) % FAST_BOARD.length;
          if (FAST_BOARD[f.pos].type === "payday") {
            p.cash += f.income;
            log(s, `${p.name} วันรับเงิน +${baht(f.income)}`);
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
        if (BOARD[p.pos] === "payday") payday(s, p);
      }
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
        log(s, `${p.name} ทำบุญ ${baht(amount)} เลือกทอย 2 ลูกได้ 3 ตา`);
      } else {
        log(s, `${p.name} ไม่ทำบุญ`);
      }
      s.step = "end";
      break;
    }
    case "deal": {
      if (!myTurn || s.step !== "deal") throw new GameError("ตอนนี้เปิดดีลไม่ได้");
      const index = draw(s, action.size, ctx);
      s.card = { deck: action.size, index };
      const d: DealCard = (action.size === "small" ? SMALL_DEALS : BIG_DEALS)[index];
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
      } else if (d.type === "stock") {
        log(s, `${p.name} เปิดการ์ด ${STOCK_LABEL[d.stock]} ราคา ฿${d.price}`);
        setResponders(s, [p.id, ...holders(s, d.stock).filter((id) => id !== p.id)], ctx);
      } else {
        log(s, `${p.name} เปิดการ์ด ${d.name}`);
        setResponders(s, [p.id], ctx);
      }
      break;
    }
    case "respond":
      respond(s, p, action);
      break;
    case "endTurn":
      if (!myTurn || s.step !== "end") throw new GameError("ยังจบตาไม่ได้");
      s.turn = (s.turn + 1) % s.players.length;
      startTurn(s);
      break;
  }

  checkWinner(s);
  return s;
}

/** ส่งให้มือถือ/จอ host - ตัดความลับออก */
export type PublicPlayer = Omit<Player, "token">;
export type PublicState = Omit<GameState, "players" | "decks"> & {
  players: PublicPlayer[];
  /** เหลือการ์ดในกองกี่ใบ (ไม่ส่งลำดับการ์ดออกไป) */
  deckLeft: Record<Deck, number>;
};

export function publicState(s: GameState): PublicState {
  const { decks, players, ...rest } = s;
  return {
    ...rest,
    deckLeft: { small: decks.small.length, big: decks.big.length, doodad: decks.doodad.length, market: decks.market.length },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ตัด token ออก
    players: players.map(({ token, ...p }) => p),
  };
}

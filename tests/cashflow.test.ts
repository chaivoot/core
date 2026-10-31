import { describe, expect, it } from "vitest";
import { BIG_DEALS, BOARD, DECK_VERSION, DOODADS, DREAMS, FAST_BOARD, FAST_GOAL, FAST_MULTIPLIER, LOAN_PAYMENT, LOAN_UNIT, MARKETS, PROFESSIONS, SMALL_DEALS } from "@/lib/cashflow/data";
import {
  act,
  GameError,
  loanRoom,
  logText,
  logWho,
  monthlyCashflow,
  newGame,
  publicState,
  tick,
  totalExpenses,
  type Action,
  type Actor,
  type GameState,
} from "@/lib/cashflow/engine";

let n = 0;
const ctx = (rolls: number[] = []) => {
  const queue = [...rolls];
  return {
    now: 1_000,
    // ค่าที่ต่อคิวไว้ใช้ก่อน (ลูกเต๋า) ที่เหลือ = 0 (สับการ์ดแบบคงที่)
    rng: () => (queue.length ? queue.shift()! : 0),
    id: () => `p${++n}`,
  };
};
const die = (face: number) => (face - 1) / 6 + 0.001;
const HOST: Actor = { host: true };

function lobby(names = ["เอ", "บี"]) {
  let s = newGame();
  const colors = ["red", "blue", "green", "yellow", "purple", "orange"];
  names.forEach((name, i) => {
    s = act(s, {}, { type: "join", name, color: colors[i], token: `t${i}` }, ctx());
  });
  return s;
}

function started(names?: string[]) {
  return act(lobby(names), HOST, { type: "start" }, ctx());
}

/** หาตำแหน่งการ์ดตามเงื่อนไข (ไม่ผูกกับลำดับการ์ด) */
const smallIdx = (f: (d: (typeof SMALL_DEALS)[number]) => boolean) => SMALL_DEALS.findIndex(f);
const marketIdx = (f: (m: (typeof MARKETS)[number]) => boolean) => MARKETS.findIndex(f);
const pharma600 = () => smallIdx((d) => d.type === "stock" && d.stock === "pharma" && d.price === 600);
const firstCondo = () => smallIdx((d) => d.type === "asset" && d.tag === "condo21");

/** ตำแหน่งช่องบนกระดาน (ไม่ผูกกับลำดับช่อง) */
const MARKET_POS = BOARD.indexOf("market");
const DOODAD_POS = BOARD.indexOf("doodad");
const PAYDAY_POS = BOARD.indexOf("payday");

const me = (s: GameState) => ({ playerId: s.players[s.turn].id });
const run = (s: GameState, a: Action, actor: Actor = me(s), rolls?: number[]) => act(s, actor, a, ctx(rolls));

describe("กระดานและข้อมูล", () => {
  it("ทางด่วน 32 ช่อง มุมเป็นวันรับเงิน", () => {
    expect(FAST_BOARD).toHaveLength(32);
    expect([0, 8, 16, 24].map((i) => FAST_BOARD[i].type)).toEqual(["payday", "payday", "payday", "payday"]);
    expect(FAST_BOARD.filter((q) => q.type === "biz")).toHaveLength(16);
    expect(FAST_BOARD.filter((q) => q.type === "dream")).toHaveLength(8);
  });

  it("โอกาสอยู่ทุกช่องเว้นช่อง เงินเดือนและช่องพิเศษห่างกันทุก 8 ช่อง", () => {
    BOARD.forEach((sq, i) => expect(sq === "opportunity").toBe(i % 2 === 0));
    const at = (sq: string) => BOARD.flatMap((b, i) => (b === sq ? [i] : []));
    expect(at("payday")).toEqual([7, 15, 23]);
    const specials = BOARD.flatMap((b, i) => (["charity", "baby", "downsize"].includes(b) ? [i] : []));
    expect(specials).toEqual([5, 13, 21]);
  });

  it("กระดาน 24 ช่องตามร่าง", () => {
    const count = (sq: string) => BOARD.filter((b) => b === sq).length;
    expect(BOARD).toHaveLength(24);
    expect([count("opportunity"), count("payday"), count("market"), count("doodad")]).toEqual([12, 3, 3, 3]);
    expect([SMALL_DEALS.length, BIG_DEALS.length, MARKETS.length, DOODADS.length, PROFESSIONS.length]).toEqual([56, 42, 42, 42, 12]);
  });

  it("กระแสเงินสดตั้งต้นตรงกับตารางอาชีพ", () => {
    const expected = [640, 1_010, 920, 1_130, 1_100, 1_480, 1_950, 3_450, 740, 1_160, 2_580, 3_350].map((n) => n * 30);
    PROFESSIONS.forEach((pr, i) => {
      const total = pr.tax + pr.house + pr.car + pr.card + pr.other;
      expect(pr.salary - total).toBe(expected[i]);
    });
  });
});

describe("เข้าห้องและเริ่มเกม", () => {
  it("สีซ้ำไม่ได้ ต้องมี 2 คนขึ้นไป และ host เท่านั้นที่เริ่มได้", () => {
    const one = lobby(["เอ"]);
    expect(() => act(one, {}, { type: "join", name: "บี", color: "red", token: "x" }, ctx())).toThrow("สีนี้มีคนเลือกแล้ว");
    expect(() => act(one, HOST, { type: "start" }, ctx())).toThrow(GameError);
    expect(() => act(lobby(), { playerId: "p1" }, { type: "start" }, ctx())).toThrow("host");
  });

  it("ห้องจำเวอร์ชันชุดการ์ดตอนเริ่มเกม", () => {
    expect(newGame().deckVersion).toBe(DECK_VERSION);
    const s = started();
    expect(s.deckVersion).toBe(DECK_VERSION);
    expect(DECK_VERSION).toMatch(/^[0-9a-z]+$/);
  });

  it("เริ่มเกม: ได้อาชีพ เงินออมตั้งต้น และไม่ส่ง token ออกไป", () => {
    const s = started();
    expect(s.phase).toBe("playing");
    for (const p of s.players) expect(p.cash).toBe(PROFESSIONS[p.prof].savings);
    expect(JSON.stringify(publicState(s))).not.toContain("t0");
  });
});

describe("หนึ่งตา", () => {
  it("ทอย 1 → ช่องจ่ายซะ จ่ายเงิน แล้วจบตา", () => {
    let s = started();
    const p = s.players[0];
    s.players[0].pos = DOODAD_POS - 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    expect(s.players[0].pos).toBe(DOODAD_POS);
    expect(s.card?.deck).toBe("doodad");
    expect(s.players[0].cash).toBeLessThan(p.cash);
    expect(s.step).toBe("end");
    s = run(s, { type: "endTurn" }, { playerId: p.id });
    expect(s.turn).toBe(1);
  });

  it("บันทึกเหตุการณ์ระบุผู้เล่น (ใช้ทำบันทึกส่วนตัว)", () => {
    let s = started();
    const id = s.players[0].id;
    s.players[0].pos = DOODAD_POS - 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    const last = s.log[s.log.length - 1];
    expect(logWho(last)).toBe(id);
    expect(logText(last)).toContain("จ่ายซะ");
  });

  it("เดินผ่านช่องเงินเดือน ได้กระแสเงินสด", () => {
    let s = started();
    const before = s.players[0].cash;
    const cf = monthlyCashflow(s.players[0]);
    s.players[0].pos = PAYDAY_POS - 3;
    s = run(s, { type: "roll" }, me(s), [die(6)]); // เดินผ่านช่องเงินเดือน ไปหยุดช่องโอกาส
    expect(s.step).toBe("deal");
    expect(s.players[0].payday).toBe(1);
    expect(s.players[0].cash).toBe(before); // ยังไม่กดรับ
    expect(() => run(s, { type: "collect" }, { playerId: s.players[1].id })).toThrow("ไม่มีเงินเดือน");
    s = run(s, { type: "collect" });
    expect(s.players[0].cash).toBe(before + cf);
    expect(s.players[0].payday).toBe(0);
    expect(() => run(s, { type: "collect" })).toThrow("ไม่มีเงินเดือน");
  });

  it("ลืมกดรับเงินเดือน ระบบให้ตอนจบตา", () => {
    let s = started();
    const before = s.players[0].cash;
    const cf = monthlyCashflow(s.players[0]);
    s.players[0].pos = PAYDAY_POS - 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]); // ตกช่องเงินเดือนพอดี
    expect(s.players[0].payday).toBe(1);
    s = run(s, { type: "endTurn" });
    expect(s.players[0].cash).toBe(before + cf);
    expect(s.players[0].payday).toBe(0);
  });

  it("เปิดการ์ดหุ้น: คนเปิดซื้อได้ คนถือหุ้นอยู่ขายได้", () => {
    let s = started();
    const [a, b] = s.players;
    s.players[1].stocks.pharma = { qty: 500, cost: 2_500 };
    s.players[0].pos = 1; // ทอย 1 → ช่อง 2 โอกาส
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s.decks.small = [pharma600()]; // หุ้นบริษัทยา ฿600
    s = run(s, { type: "deal", size: "small" });
    expect(s.responders).toEqual({ [a.id]: false, [b.id]: false });

    expect(() => run(s, { type: "respond", buy: 100 }, { playerId: b.id })).toThrow("คนเปิดการ์ด");
    s = run(s, { type: "respond", sell: 500 }, { playerId: b.id });
    expect(s.players[1].cash).toBe(b.cash + 500 * 600);
    expect(s.players[1].stocks.pharma).toBeUndefined();
    expect(s.step).toBe("respond");

    s.players[0].cash = 200_000;
    s = run(s, { type: "respond", buy: 200 }, { playerId: a.id });
    expect(s.players[0].stocks.pharma).toEqual({ qty: 200, cost: 120_000 });
    expect(s.step).toBe("end");
  });

  it("คนอื่นไม่ตอบใน 30 วินาที = ไม่ขาย", () => {
    let s = started();
    s.players[1].stocks.elec = { qty: 100, cost: 1_000 };
    s.players[0].pos = 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s.decks.small = [smallIdx((d) => d.type === "stock" && d.stock === "elec")];
    s = run(s, { type: "deal", size: "small" });
    s = run(s, { type: "respond" });
    expect(tick(s, 1_000)).toBeNull();
    const after = tick(s, 1_000 + 31_000)!;
    expect(after.step).toBe("end");
    expect(after.players[1].stocks.elec?.qty).toBe(100);
  });

  it("ซื้อคอนโด: จ่ายดาวน์ ได้กระแสเงินสด และขายได้ในการ์ดตลาด", () => {
    let s = started();
    s.players[0].cash = 100_000;
    s.players[0].pos = 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    const i = firstCondo();
    const d = SMALL_DEALS[i] as Extract<(typeof SMALL_DEALS)[number], { type: "asset" }>;
    s.decks.small = [i];
    s = run(s, { type: "deal", size: "small" });
    s = run(s, { type: "respond", buy: true });
    const p = s.players[0];
    expect(p.cash).toBe(100_000 - d.down);
    expect(p.assets[0]).toMatchObject({ cashflow: d.cashflow, mortgage: d.mortgage });

    // ตาคนที่ 2 ตกช่องตลาด เปิดการ์ดคนขอซื้อคอนโด
    const mi = marketIdx((m) => m.type === "sellAsset" && m.tag === "condo21");
    const offer = (MARKETS[mi] as { price: number }).price;
    s = run(s, { type: "endTurn" });
    s.players[1].pos = MARKET_POS - 1;
    s.decks.market = [mi];
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    expect(Object.keys(s.responders)).toEqual([p.id]);
    s = run(s, { type: "respond", sellAssets: [p.assets[0].uid] }, { playerId: p.id });
    expect(s.players[0].cash).toBe(100_000 - d.down + offer - d.mortgage);
    expect(s.players[0].assets).toHaveLength(0);
  });

  it("เงินดาวน์ไม่พอ ซื้อไม่ได้", () => {
    let s = started();
    s.players[0].cash = 1_000;
    s.players[0].pos = 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s.decks.big = [0];
    s = run(s, { type: "deal", size: "big" });
    expect(() => run(s, { type: "respond", buy: true })).toThrow("เงินสดไม่พอ");
    s = run(s, { type: "respond", buy: false });
    expect(s.step).toBe("end");
  });
});

describe("โหมดซื้อดีลต่อ (host ตั้งค่า)", () => {
  function openCondo(resell: boolean) {
    let s = lobby(["เอ", "บี", "ซี"]);
    if (resell) s = act(s, HOST, { type: "setOptions", resellDeals: true }, ctx());
    s = act(s, HOST, { type: "start" }, ctx());
    s.players[0].pos = 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s.decks.small = [firstCondo()];
    s = run(s, { type: "deal", size: "small" });
    return s;
  }

  it("ปิดโหมด (ค่าเริ่มต้น): คนเปิดไม่ซื้อ ดีลทิ้งไป", () => {
    let s = openCondo(false);
    s = run(s, { type: "respond", buy: false });
    expect(s.step).toBe("end");
  });

  it("ขายสิทธิ์: คนเปิดประกาศค่านายหน้า คนแรกที่รับจ่ายค่านายหน้า + ดาวน์ แล้วได้ทรัพย์สิน", () => {
    let s = openCondo(true);
    const [a, b, c] = s.players;
    const d = SMALL_DEALS[firstCondo()] as Extract<(typeof SMALL_DEALS)[number], { type: "asset" }>;
    expect(() => run(s, { type: "sellRight", pct: 20 })).toThrow("3% ถึง 15%");
    s = run(s, { type: "sellRight", pct: 10 });
    const fee = Math.round(d.down * 0.1);
    expect(s.resale).toBe(true);
    expect(s.rightFee).toBe(fee);
    expect(s.responders).toEqual({ [b.id]: false, [c.id]: false });

    s.players[2].cash = 1_000_000;
    s = run(s, { type: "respond", buy: true }, { playerId: c.id });
    expect(s.players[2].assets).toHaveLength(1);
    expect(s.players[2].cash).toBe(1_000_000 - d.down - fee);
    expect(s.players[0].cash).toBe(a.cash + fee);
    expect(s.step).toBe("end");
    expect(() => run(s, { type: "respond", buy: true }, { playerId: b.id })).toThrow();
  });

  it("คนเปิดกดไม่ซื้อ = จบ ดีลทิ้งไป (ไม่ส่งต่ออัตโนมัติ)", () => {
    let s = openCondo(true);
    s = run(s, { type: "respond", buy: false });
    expect(s.step).toBe("end");
    expect(s.resale).toBeFalsy();
  });

  it("ขายสิทธิ์การ์ดหุ้นไม่ได้", () => {
    let s = lobby(["เอ", "บี"]);
    s = act(s, HOST, { type: "setOptions", resellDeals: true }, ctx());
    s = act(s, HOST, { type: "start" }, ctx());
    s.players[0].pos = 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s.decks.small = [pharma600()];
    s = run(s, { type: "deal", size: "small" });
    expect(() => run(s, { type: "sellRight", pct: 5 })).toThrow("ทรัพย์สินหรือธุรกิจ");
  });

  it("คำอธิบายก่อนเริ่มเกม: host เปิด/เลื่อนหน้าได้ เริ่มเกมแล้วปิดเอง", () => {
    let s = act(lobby(), HOST, { type: "intro", slide: 2 }, ctx());
    expect(s.intro).toBe(2);
    expect(() => act(s, { playerId: s.players[0].id }, { type: "intro", slide: 3 }, ctx())).toThrow("host");
    s = act(s, HOST, { type: "start" }, ctx());
    expect(s.intro).toBeNull();
    expect(() => act(s, HOST, { type: "intro", slide: 0 }, ctx())).toThrow("ก่อนเริ่มเกม");
  });

  it("ตั้งค่าได้เฉพาะ host และก่อนเริ่มเกม", () => {
    expect(() => act(lobby(), { playerId: "x" }, { type: "setOptions", resellDeals: true }, ctx())).toThrow("host");
    expect(() => act(started(), HOST, { type: "setOptions", resellDeals: true }, ctx())).toThrow("ก่อนเริ่มเกม");
  });
});

describe("การ์ดแบบใหม่", () => {
  function opp() {
    let s = started();
    s.players[0].pos = 1;
    return run(s, { type: "roll" }, me(s), [die(1)]);
  }

  it("เหรียญทองคำ: ซื้อทีละเหรียญ ไม่เกินจำนวนที่มีขาย แล้วขายในการ์ดตลาดได้", () => {
    let s = opp();
    s.players[0].cash = 100_000;
    s.decks.small = [smallIdx((d) => d.type === "stock" && d.stock === "gold" && d.max === 10)];
    s = run(s, { type: "deal", size: "small" });
    expect(() => run(s, { type: "respond", buy: 11 })).toThrow("มีขายแค่ 10");
    s = run(s, { type: "respond", buy: 7 });
    expect(s.players[0].stocks.gold).toEqual({ qty: 7, cost: 63_000 });

    s = run(s, { type: "endTurn" });
    s.players[1].pos = MARKET_POS - 1;
    s.decks.market = [marketIdx((m) => m.type === "sellStock" && m.stock === "gold" && m.price === 30_000)];
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s = run(s, { type: "respond", sell: 7 }, { playerId: s.players[0].id });
    expect(s.players[0].cash).toBe(100_000 - 63_000 + 7 * 30_000);
  });

  it("การ์ดตลาด: แตกพาร์/รวมพาร์ เปลี่ยนจำนวนหุ้นของทุกคนที่ถืออยู่", () => {
    let s = started();
    s.players[0].stocks.ent = { qty: 50, cost: 5_000 };
    s.players[1].stocks.ent = { qty: 15, cost: 3_000 };
    s.players[0].pos = MARKET_POS - 1;
    s.decks.market = [marketIdx((m) => m.type === "split" && m.factor === 0.5)];
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    expect(s.players[0].stocks.ent?.qty).toBe(25);
    expect(s.players[1].stocks.ent?.qty).toBe(7);
    expect(s.step).toBe("end");
  });

  it("การ์ดตลาด: หุ้นพุ่ง คนถือหุ้นขายได้ในราคาบนการ์ด", () => {
    let s = started();
    s.players[1].stocks.pharma = { qty: 100, cost: 15_000 };
    const before = s.players[1].cash;
    s.players[0].pos = MARKET_POS - 1;
    const mi = marketIdx((m) => m.type === "sellStock" && m.stock === "pharma");
    s.decks.market = [mi];
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s = run(s, { type: "respond", sell: 100 }, { playerId: s.players[1].id });
    expect(s.players[1].cash).toBe(before + 100 * (MARKETS[mi] as { price: number }).price);
  });

  it("ศูนย์การค้า: ผู้ซื้อให้ราคา 2 เท่าของราคาซื้อ", () => {
    let s = started();
    const d = BIG_DEALS.find((x) => x.type === "asset" && x.tag === "mall") as Extract<(typeof BIG_DEALS)[number], { type: "asset" }>;
    s.players[0].assets.push({ uid: "m", name: d.name, tag: "mall", price: d.price, units: 1, down: d.down, mortgage: d.mortgage, cashflow: d.cashflow, rental: true });
    const before = s.players[0].cash;
    s.players[0].pos = MARKET_POS - 1;
    s.decks.market = [marketIdx((m) => m.type === "sellAsset" && m.tag === "mall")];
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    const mid = s.players[0].cash;
    s = run(s, { type: "respond", sellAssets: ["m"] });
    expect(s.players[0].cash).toBe(mid + d.price * 2 - d.mortgage);
  });

  it("บ้าน 3/2 มีการ์ดตลาดขอซื้อ", () => {
    let s = opp();
    s.players[0].cash = 1_000_000;
    s.decks.small = [smallIdx((d) => d.type === "asset" && d.tag === "house32")];
    s = run(s, { type: "deal", size: "small" });
    s = run(s, { type: "respond", buy: true });
    const house = s.players[0].assets[0];
    expect(house.tag).toBe("house32");
    s = run(s, { type: "endTurn" });
    s.players[1].pos = MARKET_POS - 1;
    s.decks.market = [marketIdx((m) => m.type === "sellAsset" && m.tag === "house32" && m.price === 3_000_000)];
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s = run(s, { type: "respond", sellAssets: [house.uid] }, { playerId: s.players[0].id });
    expect(s.players[0].cash).toBe(1_000_000 - house.down + 3_000_000 - house.mortgage);
  });

  it("การ์ดตลาดขอซื้อทุกใบมีทรัพย์สินในกองดีลให้ซื้อได้", () => {
    const dealTags = new Set([...SMALL_DEALS, ...BIG_DEALS].flatMap((d) => (d.type === "asset" ? [d.tag] : [])));
    for (const m of MARKETS) {
      if (m.type === "sellAsset") expect(dealTags.has(m.tag), m.text).toBe(true);
      if (m.type === "expense" || m.type === "cashflowUp") expect(m.tags.some((t) => dealTags.has(t)), m.text).toBe(true);
    }
  });

  it("ญาติขอยืมเงิน: จ่ายทันทีแล้วจบตา", () => {
    let s = opp();
    const i = smallIdx((d) => d.type === "lend");
    const amount = (SMALL_DEALS[i] as { amount: number }).amount;
    s.players[0].cash = 100_000;
    s.decks.small = [i];
    s = run(s, { type: "deal", size: "small" });
    expect(s.players[0].cash).toBe(100_000 - amount);
    expect(s.step).toBe("end");
  });

  it("การ์ดตลาดค่าใช้จ่าย/กำไรเพิ่ม มีผลเฉพาะคนที่ถือทรัพย์สินกลุ่มนั้น", () => {
    let s = started();
    const asset = (tag: string, rental: boolean) => ({ uid: tag, name: tag, tag, price: 1, units: 1, down: 0, mortgage: 0, cashflow: 1_000, rental });
    s.players[1].assets.push(asset("apartment", true), asset("franchise", false));
    s.players[1].cash = 100_000;
    const cash0 = s.players[0].cash;
    const cash1 = s.players[1].cash;
    const play = (f: (m: (typeof MARKETS)[number]) => boolean) => {
      s.turn = 0;
      s.step = "roll";
      s.players[0].pos = MARKET_POS - 1;
      s.decks.market = [marketIdx(f)];
      s = run(s, { type: "roll" }, me(s), [die(1)]);
    };
    play((m) => m.type === "expense" && m.tags.includes("apartment"));
    expect(s.players[0].cash).toBe(cash0);
    expect(s.players[1].cash).toBe(cash1 - 60_000);
    play((m) => m.type === "cashflowUp");
    expect(s.players[1].assets.find((a) => a.tag === "franchise")?.cashflow).toBe(7_000);
    play((m) => m.type === "rentUp");
    expect(s.players[1].assets.map((a) => a.cashflow)).toEqual([2_500, 7_000]);
  });
});

describe("เงินกู้และหนี้", () => {
  it("กู้ได้จนกระแสเงินสดเหลือ 0 และคืนได้", () => {
    let s = started();
    const p0 = s.players[0];
    const room = loanRoom(p0);
    expect(room).toBe(Math.floor(monthlyCashflow(p0) / LOAN_PAYMENT));
    expect(() => run(s, { type: "loan", count: room + 1 })).toThrow("ติดลบ");
    s = run(s, { type: "loan", count: 2 });
    expect(s.players[0].cash).toBe(p0.cash + 2 * LOAN_UNIT);
    expect(totalExpenses(s.players[0])).toBe(totalExpenses(p0) + 2 * LOAN_PAYMENT);
    s = run(s, { type: "repay" });
    expect(s.players[0].loans).toBe(1);
  });

  it("จ่ายไม่คาดฝันแล้วเงินไม่พอ กู้ให้อัตโนมัติ", () => {
    let s = started();
    s.players[0].cash = 0;
    const di = DOODADS.reduce((best, d, k) => (d.amount > DOODADS[best].amount ? k : best), 0);
    const amount = DOODADS[di].amount;
    s.decks.doodad = [di];
    s.players[0].pos = DOODAD_POS - 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    const loans = Math.ceil(amount / LOAN_UNIT);
    expect(s.players[0].loans).toBe(loans);
    expect(s.players[0].cash).toBe(loans * LOAN_UNIT - amount);
  });

  it("ปิดหนี้บัตรเครดิต ตัดค่าผ่อนออก", () => {
    let s = started();
    const pr = PROFESSIONS[s.players[0].prof];
    s.players[0].cash = pr.card * 30;
    const before = totalExpenses(s.players[0]);
    s = run(s, { type: "payoff", debt: "card" });
    expect(s.players[0].cash).toBe(0);
    expect(totalExpenses(s.players[0])).toBe(before - pr.card);
  });
});

describe("ออกจากสนามแข่งหนู → ทางด่วน", () => {
  /** ให้ผู้เล่นคนแรกซื้ออพาร์ตเมนต์ 24 ห้อง (+40,000) จนรายได้จากทรัพย์สินมากกว่ารายจ่าย */
  /** ให้ผู้เล่นคนแรก (พนักงานขาย หนี้ปิดหมด) ซื้ออพาร์ตเมนต์ที่กระแสเงินสดสูงสุด จนรายได้จากทรัพย์สินมากกว่ารายจ่าย */
  const best = BIG_DEALS.reduce((b, d, k) => (d.type === "asset" && d.cashflow > (BIG_DEALS[b] as { cashflow: number }).cashflow ? k : b), 0);
  const bestCf = (BIG_DEALS[best] as { cashflow: number }).cashflow;
  function escaped() {
    let s = started();
    s.players[0].prof = 0;
    const pr = PROFESSIONS[0];
    s.players[0].cash = 10_000_000;
    s.players[0].pos = 1;
    s.players[0].debts = { house: false, car: false, card: false };
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s.decks.big = [best];
    s = run(s, { type: "deal", size: "big" });
    s = run(s, { type: "respond", buy: true });
    return { s, pr };
  }

  it("ออกจากสนามแข่งหนูแล้วขึ้นทางด่วน เกมยังไม่จบ", () => {
    const { s } = escaped();
    const p = s.players[0];
    expect(s.phase).toBe("playing");
    expect(p.fast).toMatchObject({ pos: 0, income: bestCf * FAST_MULTIPLIER, dream: -1 });
    expect(p.fast!.goal).toBe(p.fast!.income + FAST_GOAL);
  });

  it("ตาแรกบนทางด่วนต้องเลือกความฝันก่อน แล้วทอย 2 ลูก", () => {
    let { s } = escaped();
    s = run(s, { type: "endTurn" });
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s = run(s, { type: "endTurn" });
    if (s.turn !== 0) {
      s = run(s, { type: "roll" }, me(s), [die(1)]);
      s = run(s, { type: "endTurn" });
    }
    expect(s.step).toBe("dream");
    expect(() => run(s, { type: "roll" })).toThrow();
    s = run(s, { type: "chooseDream", dream: 7 });
    s = run(s, { type: "roll" }, me(s), [die(1), die(2)]); // 3 ช่อง → ธุรกิจ (ช่อง 3 = biz)
    expect(s.dice).toEqual([1, 2]);
    expect(s.players[0].fast!.pos).toBe(3);
  });

  it("ซื้อธุรกิจบนทางด่วนเพิ่มรายได้ต่อรอบ ถึงเป้าแล้วชนะ", () => {
    let { s } = escaped();
    const f = s.players[0].fast!;
    f.dream = 1; // ช่อง 2 เป็นความฝัน index 0 (ไม่ใช่ของเรา)
    s.players[0].cash = 100_000_000;
    s.turn = 0;
    s.step = "roll";
    s = run(s, { type: "roll" }, me(s), [0, 0]); // ลูกเต๋า 1+1 = ช่อง 2 = ความฝัน (ไม่ใช่ของเรา)
    expect(s.card?.deck).toBe("dream");
    expect(s.step).toBe("end");
    s.step = "roll";
    s.players[0].fast!.income = s.players[0].fast!.goal - 100_000;
    s.players[0].fast!.pos = 0;
    s = run(s, { type: "roll" }, me(s), [0, die(2)]); // 1+2 = ช่อง 3 = ธุรกิจ index 1 (+260,000)
    expect(s.card).toEqual({ deck: "fastBiz", index: 1 });
    s = run(s, { type: "respond", buy: true });
    expect(s.phase).toBe("over");
    expect(s.winner).toBe(s.players[0].id);
  });

  it("ซื้อความฝันของตัวเองได้ = ชนะ", () => {
    let { s } = escaped();
    s.players[0].fast!.dream = 0;
    s.players[0].cash = DREAMS[0].cost;
    s.turn = 0;
    s.step = "roll";
    s = run(s, { type: "roll" }, me(s), [0, 0]); // ช่อง 2 = ความฝัน index 0
    expect(s.step).toBe("respond");
    s = run(s, { type: "respond", buy: true });
    expect(s.phase).toBe("over");
  });

  it("คนบนทางด่วนไม่โดนการ์ดสนามแข่งหนู และกู้เงินไม่ได้", () => {
    const { s } = escaped();
    expect(() => run(s, { type: "loan" })).toThrow("ทางด่วน");
  });
});

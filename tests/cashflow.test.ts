import { describe, expect, it } from "vitest";
import { BOARD, MARKETS, PROFESSIONS, SMALL_DEALS, BIG_DEALS } from "@/lib/cashflow/data";
import {
  act,
  GameError,
  loanRoom,
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

const me = (s: GameState) => ({ playerId: s.players[s.turn].id });
const run = (s: GameState, a: Action, actor: Actor = me(s), rolls?: number[]) => act(s, actor, a, ctx(rolls));

describe("กระดานและข้อมูล", () => {
  it("กระดาน 24 ช่องตามร่าง", () => {
    const count = (sq: string) => BOARD.filter((b) => b === sq).length;
    expect(BOARD).toHaveLength(24);
    expect([count("opportunity"), count("payday"), count("market"), count("doodad")]).toEqual([10, 3, 4, 4]);
    expect([SMALL_DEALS.length, BIG_DEALS.length, MARKETS.length]).toEqual([26, 16, 17]);
  });

  it("กระแสเงินสดตั้งต้นตรงกับตารางอาชีพ", () => {
    const expected = [7_000, 7_500, 7_000, 9_000, 7_000, 9_000, 12_000, 20_000];
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

  it("เริ่มเกม: ได้อาชีพ เงินออมตั้งต้น และไม่ส่ง token ออกไป", () => {
    const s = started();
    expect(s.phase).toBe("playing");
    for (const p of s.players) expect(p.cash).toBe(PROFESSIONS[p.prof].savings);
    expect(JSON.stringify(publicState(s))).not.toContain("t0");
  });
});

describe("หนึ่งตา", () => {
  it("ทอย 1 → ช่องจ่ายไม่คาดฝัน จ่ายเงิน แล้วจบตา", () => {
    let s = started();
    const p = s.players[0];
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    expect(s.players[0].pos).toBe(1);
    expect(s.card?.deck).toBe("doodad");
    expect(s.players[0].cash).toBeLessThan(p.cash);
    expect(s.step).toBe("end");
    s = run(s, { type: "endTurn" }, { playerId: p.id });
    expect(s.turn).toBe(1);
  });

  it("เดินผ่านช่องเงินเดือน ได้กระแสเงินสด", () => {
    let s = started();
    const before = s.players[0].cash;
    const cf = monthlyCashflow(s.players[0]);
    s = run(s, { type: "roll" }, me(s), [die(6)]); // 0 → 6 ผ่านช่อง 5 (เงินเดือน)
    expect(s.players[0].cash).toBe(before + cf);
    expect(s.step).toBe("deal");
  });

  it("เปิดการ์ดหุ้น: คนเปิดซื้อได้ คนถือหุ้นอยู่ขายได้", () => {
    let s = started();
    const [a, b] = s.players;
    s.players[1].stocks.pharma = { qty: 500, cost: 2_500 };
    s.players[0].pos = 1; // ทอย 1 → ช่อง 2 โอกาส
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s.decks.small = [2]; // หุ้นบริษัทยา ฿20
    s = run(s, { type: "deal", size: "small" });
    expect(s.responders).toEqual({ [a.id]: false, [b.id]: false });

    expect(() => run(s, { type: "respond", buy: 100 }, { playerId: b.id })).toThrow("คนเปิดการ์ด");
    s = run(s, { type: "respond", sell: 500 }, { playerId: b.id });
    expect(s.players[1].cash).toBe(b.cash + 500 * 20);
    expect(s.players[1].stocks.pharma).toBeUndefined();
    expect(s.step).toBe("respond");

    s = run(s, { type: "respond", buy: 200 }, { playerId: a.id });
    expect(s.players[0].stocks.pharma).toEqual({ qty: 200, cost: 4_000 });
    expect(s.step).toBe("end");
  });

  it("คนอื่นไม่ตอบใน 30 วินาที = ไม่ขาย", () => {
    let s = started();
    s.players[1].stocks.elec = { qty: 100, cost: 1_000 };
    s.players[0].pos = 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s.decks.small = [8];
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
    s.decks.small = [12]; // คอนโด 1 ห้องนอน
    s = run(s, { type: "deal", size: "small" });
    s = run(s, { type: "respond", buy: true });
    const p = s.players[0];
    expect(p.cash).toBe(55_000);
    expect(p.assets[0]).toMatchObject({ cashflow: 2_000, mortgage: 855_000 });

    // ตาคนที่ 2 ตกช่องตลาด เปิด "คอนโด ฿1,300,000"
    s = run(s, { type: "endTurn" });
    s.players[1].pos = 6;
    s.decks.market = [0];
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    expect(Object.keys(s.responders)).toEqual([p.id]);
    s = run(s, { type: "respond", sellAssets: [p.assets[0].uid] }, { playerId: p.id });
    expect(s.players[0].cash).toBe(55_000 + 1_300_000 - 855_000);
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

describe("เงินกู้และหนี้", () => {
  it("กู้ได้จนกระแสเงินสดเหลือ 0 และคืนได้", () => {
    let s = started();
    const p0 = s.players[0];
    const room = loanRoom(p0);
    expect(room).toBe(Math.floor(monthlyCashflow(p0) / 1_000));
    expect(() => run(s, { type: "loan", count: room + 1 })).toThrow("ติดลบ");
    s = run(s, { type: "loan", count: 2 });
    expect(s.players[0].cash).toBe(p0.cash + 20_000);
    expect(totalExpenses(s.players[0])).toBe(totalExpenses(p0) + 2_000);
    s = run(s, { type: "repay" });
    expect(s.players[0].loans).toBe(1);
  });

  it("จ่ายไม่คาดฝันแล้วเงินไม่พอ กู้ให้อัตโนมัติ", () => {
    let s = started();
    s.players[0].cash = 0;
    s.decks.doodad = [6]; // นาฬิกา ฿50,000
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    expect(s.players[0].loans).toBe(5);
    expect(s.players[0].cash).toBe(0);
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

describe("ออกจากวงหนูวิ่ง", () => {
  it("รายได้จากทรัพย์สินมากกว่ารายจ่าย = ชนะ", () => {
    let s = started();
    s.players[0].cash = 10_000_000;
    s.players[0].pos = 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s.decks.big = [2]; // อพาร์ตเมนต์ 24 ห้อง +40,000
    s = run(s, { type: "deal", size: "big" });
    s = run(s, { type: "respond", buy: true });
    const p = s.players[0];
    if (40_000 > totalExpenses(p)) {
      expect(s.phase).toBe("over");
      expect(s.winner).toBe(p.id);
    } else {
      expect(s.phase).toBe("playing");
    }
  });
});

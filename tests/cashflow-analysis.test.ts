import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/cashflow/analysis";
import { BOARD, DOODADS, LOAN_UNIT, SMALL_DEALS } from "@/lib/cashflow/data";
import { act, newGame, publicState, type Action, type Actor, type GameState } from "@/lib/cashflow/engine";

let n = 0;
const ctx = (rolls: number[] = []) => {
  const q = [...rolls];
  return { now: 60_000 * ++n, rng: () => (q.length ? q.shift()! : 0), id: () => `p${++n}` };
};
const die = (face: number) => (face - 1) / 6 + 0.001;
const HOST: Actor = { host: true };
const me = (s: GameState) => ({ playerId: s.players[s.turn].id });
const run = (s: GameState, a: Action, actor: Actor = me(s), rolls?: number[]) => act(s, actor, a, ctx(rolls));

function started() {
  let s = newGame();
  ["เอ", "บี"].forEach((name, i) => {
    s = act(s, {}, { type: "join", name, color: ["red", "blue"][i], token: `t${i}` }, ctx());
  });
  return act(s, HOST, { type: "start" }, ctx());
}
const condo = () => SMALL_DEALS.findIndex((d) => d.type === "asset" && d.tag === "condo21");
const toOpportunity = (s: GameState) => {
  s.players[s.turn].pos = 1;
  return run(s, { type: "roll" }, me(s), [die(1)]);
};

describe("วิเคราะห์การเล่น", () => {
  it("แยกหนี้ดี/หนี้เสีย ดีลที่ปล่อย และสไตล์", () => {
    let s = started();
    const a = s.players[0];
    // ตาเอ: กู้แล้วซื้อคอนโดในตาเดียวกัน = หนี้ดี
    s = toOpportunity(s);
    s.players[0].cash = 0;
    s.decks.small = [condo()];
    s = run(s, { type: "deal", size: "small" });
    s = run(s, { type: "loan", count: 3 });
    s = run(s, { type: "respond", buy: true });
    s = run(s, { type: "endTurn" });
    // ตาบี: มีเงินพอแต่ไม่ซื้อ
    s = toOpportunity(s);
    s.players[1].cash = 1_000_000;
    s.decks.small = [condo()];
    s = run(s, { type: "deal", size: "small" });
    s = run(s, { type: "respond", buy: false }); // จบตาอัตโนมัติ
    // ตาเอ: จ่ายซะจนต้องกู้อัตโนมัติ = หนี้เสีย
    s.players[0].cash = 0;
    s.players[0].pos = BOARD.indexOf("doodad") - 1;
    s.decks.doodad = [DOODADS.findIndex((d) => d.amount >= 30_000)];
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s = act(s, HOST, { type: "finish" }, ctx());

    expect(s.phase).toBe("over");
    const r = analyze(s);
    expect(r.endedBy).toBe("host");
    expect(r.rolls).toBe(3);
    const ra = r.players.find((p) => p.id === a.id)!;
    const rb = r.players.find((p) => p.id !== a.id)!;
    expect(ra.goodDebt).toBe(3 * LOAN_UNIT);
    expect(ra.badDebt).toBeGreaterThan(0);
    expect(ra.assetBuys).toBe(1);
    expect(ra.style).toBe("builder");
    expect(ra.rolls).toBe(2);
    expect(rb.declinedWithCash).toBe(1);
    expect(rb.style).toBe("watcher");
    expect(rb.insights.some((t) => t.includes("ปล่อยดีลที่มีเงินสดพอซื้อ 1 ครั้ง"))).toBe(true);
  });

  it("เหตุการณ์ไม่ถูกส่งไปที่มือถือ", () => {
    const s = toOpportunity(started());
    expect(s.events!.length).toBeGreaterThan(0);
    expect("events" in publicState(s)).toBe(false);
  });

  it("host เท่านั้นที่จบเกมได้", () => {
    const s = started();
    expect(() => run(s, { type: "finish" })).toThrow("host");
  });
});

describe("เวลาเล่น", () => {
  const lobby2 = () => {
    let s = newGame();
    ["เอ", "บี"].forEach((name, i) => {
      s = act(s, {}, { type: "join", name, color: ["red", "blue"][i], token: `t${i}` }, ctx());
    });
    return s;
  };
  const at = (now: number) => ({ now, rng: () => 0, id: () => `x${++n}` });

  it("ค่าเริ่มต้น 60 นาที ตั้งได้เฉพาะค่าที่กำหนด", () => {
    let s = lobby2();
    expect(s.options?.minutes).toBe(60);
    s = act(s, HOST, { type: "setOptions", minutes: 30 }, ctx());
    expect(s.options?.minutes).toBe(30);
    expect(s.options?.resellDeals).toBe(false);
    expect(() => act(s, HOST, { type: "setOptions", minutes: 17 }, ctx())).toThrow("เวลาเล่น");
  });

  it("หมดเวลาแล้ว เล่นตานั้นจนจบ แล้วเกมจบ", () => {
    let s = act(lobby2(), HOST, { type: "setOptions", minutes: 30 }, ctx());
    s = act(s, HOST, { type: "start" }, at(0));
    const later = 31 * 60_000;
    s.players[s.turn].pos = BOARD.indexOf("doodad") - 1;
    s = act(s, me(s), { type: "roll" }, { ...at(later), rng: () => 0.001 });
    expect(s.phase).toBe("playing"); // ยังอยู่ในตานี้
    s = act(s, me(s), { type: "endTurn" }, at(later));
    expect(s.phase).toBe("over");
    expect(s.endedBy).toBe("time");
    expect(analyze(s).endedBy).toBe("time");
  });

  it("ไม่จำกัดเวลา เล่นต่อได้", () => {
    let s = act(lobby2(), HOST, { type: "setOptions", minutes: 0 }, ctx());
    s = act(s, HOST, { type: "start" }, at(0));
    s.players[s.turn].pos = BOARD.indexOf("doodad") - 1;
    s = act(s, me(s), { type: "roll" }, { ...at(10 * 3_600_000), rng: () => 0.001 });
    s = act(s, me(s), { type: "endTurn" }, at(10 * 3_600_000));
    expect(s.phase).toBe("playing");
  });
});

describe("ทำบุญ", () => {
  it("ไม่ทำบุญ = จบตาเลย", () => {
    let s = started();
    s.players[0].pos = BOARD.indexOf("charity") - 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    expect(s.step).toBe("charity");
    s = run(s, { type: "charity", give: false });
    expect(s.turn).toBe(1);
    expect(s.step).toBe("roll");
  });

  it("ทำบุญแล้วยังไม่จบตา", () => {
    let s = started();
    s.players[0].cash = 1_000_000;
    s.players[0].pos = BOARD.indexOf("charity") - 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s = run(s, { type: "charity", give: true });
    expect(s.turn).toBe(0);
    expect(s.step).toBe("end");
  });
});

describe("ตกงาน", () => {
  it("ตกงาน: จ่ายค่าใช้จ่าย 1 เดือน หยุด 2 ตา แล้วจบตาเลย", () => {
    let s = started();
    s.players[0].cash = 1_000_000;
    s.players[0].pos = BOARD.indexOf("downsize") - 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    expect(s.players[0].skip).toBe(2);
    expect(s.players[0].cash).toBeLessThan(1_000_000);
    expect(s.turn).toBe(1);
    expect(s.step).toBe("roll");
  });
});

describe("ผู้เล่นมีธุระด่วน", () => {
  function three() {
    let s = newGame();
    ["เอ", "บี", "ซี"].forEach((name, i) => {
      s = act(s, {}, { type: "join", name, color: ["red", "blue", "green"][i], token: `t${i}` }, ctx());
    });
    return act(s, HOST, { type: "start" }, ctx());
  }

  it("พักชั่วคราว: ถึงตาข้ามให้ กลับมาเล่นต่อได้ (ผู้เล่นกดเองได้)", () => {
    let s = three();
    const [a, b, c] = s.players;
    s = act(s, { playerId: b.id }, { type: "setAway", player: b.id, away: true }, ctx());
    expect(() => act(s, { playerId: a.id }, { type: "setAway", player: b.id, away: false }, ctx())).toThrow("host");
    s.players[0].pos = BOARD.indexOf("doodad") - 1;
    s.players[0].cash = 1_000_000;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s = run(s, { type: "endTurn" });
    expect(s.players[s.turn].id).toBe(c.id); // ข้าม บี
    s = act(s, { playerId: b.id }, { type: "setAway", player: b.id, away: false }, ctx());
    expect(s.players[1].away).toBe(false);
  });

  it("พักตอนที่ถึงตาตัวเอง = ไปคนถัดไปทันที", () => {
    let s = three();
    const a = s.players[0];
    s = act(s, HOST, { type: "setAway", player: a.id, away: true }, ctx());
    expect(s.turn).toBe(1);
    expect(s.step).toBe("roll");
  });

  it("คนที่พักไม่ต้องตอบการ์ด", () => {
    let s = three();
    s.players[1].stocks.pharma = { qty: 100, cost: 1_000 };
    s = act(s, HOST, { type: "setAway", player: s.players[1].id, away: true }, ctx());
    s.players[0].pos = 1;
    s = run(s, { type: "roll" }, me(s), [die(1)]);
    s.decks.small = [SMALL_DEALS.findIndex((d) => d.type === "stock" && d.stock === "pharma")];
    s = run(s, { type: "deal", size: "small" });
    expect(Object.keys(s.responders)).toEqual([s.players[0].id]);
  });

  it("ออกจากเกม: เอาออกถาวร เหลือไม่ถึง 2 คนเกมจบ", () => {
    let s = three();
    const [, b, c] = s.players;
    expect(() => run(s, { type: "leave", player: b.id })).toThrow("host");
    s = act(s, HOST, { type: "leave", player: b.id }, ctx());
    expect(s.players[1].left).toBe(true);
    expect(s.phase).toBe("playing");
    s = act(s, HOST, { type: "leave", player: c.id }, ctx());
    expect(s.phase).toBe("over");
    expect(analyze(s).players.find((p) => p.id === b.id)!.left).toBe(true);
  });

  it("ย้ายเครื่อง: รหัสใช้ได้ครั้งเดียว token เปลี่ยน และไม่ส่งรหัสไปเครื่องอื่น", () => {
    let s = three();
    const b = s.players[1];
    s = act(s, HOST, { type: "transfer", player: b.id, code: "secret-code-1" }, ctx());
    expect(JSON.stringify(publicState(s))).not.toContain("secret-code-1");
    expect(() => act(s, {}, { type: "claim", code: "wrong-code-xx", token: "new" }, ctx())).toThrow("รหัสย้ายเครื่อง");
    s = act(s, {}, { type: "claim", code: "secret-code-1", token: "new-token" }, ctx());
    expect(s.players[1].token).toBe("new-token");
    expect(() => act(s, {}, { type: "claim", code: "secret-code-1", token: "again" }, ctx())).toThrow("รหัสย้ายเครื่อง");
  });
});

describe("ลงงบหลังซื้อขาย", () => {
  const opp = () => {
    const s = started();
    s.players[0].pos = 1;
    return run(s, { type: "roll" }, me(s), [die(1)]);
  };

  it("ซื้อหุ้นสองครั้ง: ต้นทุนเฉลี่ย", () => {
    let s = opp();
    s.players[0].cash = 1_000_000;
    s.players[0].stocks.pharma = { qty: 10, cost: 3_000 }; // เดิม 10 หุ้น @300
    s.decks.small = [SMALL_DEALS.findIndex((d) => d.type === "stock" && d.stock === "pharma" && d.price === 600)];
    s = run(s, { type: "deal", size: "small" });
    s = run(s, { type: "respond", buy: 10 });
    expect(s.players[0].entry).toMatchObject({ kind: "buyStock", cash: -6_000, qty: 10, price: 600, holdQty: 20, avgCost: 450 });
  });

  it("ซื้อทรัพย์สิน: ดาวน์ + จำนอง = ราคาเต็ม", () => {
    let s = opp();
    s.players[0].cash = 1_000_000;
    const i = SMALL_DEALS.findIndex((d) => d.type === "asset" && d.mortgage > 0);
    const d = SMALL_DEALS[i] as Extract<(typeof SMALL_DEALS)[number], { type: "asset" }>;
    s.decks.small = [i];
    s = run(s, { type: "deal", size: "small" });
    s = run(s, { type: "respond", buy: true });
    const e = s.players[0].entry!;
    expect(e.kind).toBe("buyAsset");
    expect(e.cash).toBe(-d.down);
    expect(e.down! + e.mortgage!).toBe(e.full);
    expect(e.cashflow).toBe(d.cashflow);
  });
});

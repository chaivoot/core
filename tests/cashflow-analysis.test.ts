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

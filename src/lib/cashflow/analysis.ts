// วิเคราะห์การเล่นจากเหตุการณ์ในเกม (ฟังก์ชันล้วน ใช้ทั้งสรุปตอนจบเกม เก็บถาวร และหน้าภาพรวม)

import { money, PROFESSIONS } from "./data";
import { passiveIncome, totalExpenses, type GameEvent, type GameState } from "./engine";

export type StyleKey = "builder" | "trader" | "balanced" | "cautious" | "watcher";

export const STYLES: Record<StyleKey, { label: string; icon: string; desc: string }> = {
  builder: { label: "นักสร้างกระแสเงินสด", icon: "🏘️", desc: "เน้นซื้อทรัพย์สินที่ให้เงินเข้าทุกเดือน" },
  trader: { label: "นักเก็งกำไร", icon: "📈", desc: "เน้นหุ้น/ทอง หาเงินก้อนจากส่วนต่างราคา" },
  balanced: { label: "สายผสม", icon: "⚖️", desc: "มีทั้งทรัพย์สินสร้างรายได้และเก็งกำไร" },
  cautious: { label: "ระวังมาก", icon: "🛡️", desc: "มีเงินพอแต่ปล่อยโอกาสบ่อย" },
  watcher: { label: "ผู้เฝ้าดู", icon: "👀", desc: "ยังไม่ได้ลงทุนเลย" },
};

export type PlayerReport = {
  id: string;
  name: string;
  color: string;
  profession: string;
  won: boolean;
  /** ทอยลูกเต๋ากี่ครั้ง */
  rolls: number;
  /** ออกจากสนามแข่งหนูในการทอยครั้งที่เท่าไหร่ของตัวเอง (null = ยังไม่ออก) */
  escapeRoll: number | null;
  passive: number;
  expenses: number;
  cash: number;
  /** รายได้จากทรัพย์สิน ÷ รายจ่าย (%) */
  freedomPct: number;
  deals: number;
  assetBuys: number;
  /** กระแสเงินสด/เดือนที่ได้จากทรัพย์สินที่ซื้อ */
  cashflowBought: number;
  stockBuys: number;
  declinedWithCash: number;
  declinedWithLoan: number;
  declinedNoMoney: number;
  stockProfit: number;
  assetProfit: number;
  /** กู้แล้วเอาไปซื้อทรัพย์สิน/หุ้นในตาเดียวกัน = หนี้ดี */
  goodDebt: number;
  /** กู้เพราะเงินไม่พอจ่าย (อัตโนมัติ) หรือกู้แล้วไม่ได้เอาไปลงทุน = หนี้เสีย */
  badDebt: number;
  repaid: number;
  payoffs: number;
  doodads: number;
  charityGiven: number;
  charitySkipped: number;
  paydayLost: number;
  bankrupt: number;
  rightIncome: number;
  style: StyleKey;
  insights: string[];
};

export type GameReport = {
  gameId: string;
  startedAt: number | null;
  endedAt: number | null;
  minutes: number | null;
  rolls: number;
  endedBy: "win" | "host" | "time" | "expired";
  winner: string | null;
  players: PlayerReport[];
};

const sum = (xs: GameEvent[]) => xs.reduce((s, e) => s + (e.v ?? 0), 0);

function styleOf(r: Omit<PlayerReport, "style" | "insights">): StyleKey {
  const invested = r.assetBuys + r.stockBuys;
  if (invested === 0) return "watcher";
  if (r.declinedWithCash >= 3 && r.declinedWithCash > invested) return "cautious";
  if (r.stockBuys >= 2 * r.assetBuys) return "trader";
  if (r.assetBuys >= 2 * r.stockBuys) return "builder";
  return "balanced";
}

function insightsOf(r: Omit<PlayerReport, "insights">): string[] {
  const out: string[] = [];
  if (r.escapeRoll !== null) {
    out.push(`🚀 ออกจากสนามแข่งหนูได้ในตาที่ ${r.escapeRoll} — ทรัพย์สินทำงานแทนคุณแล้ว (ฝั่ง B/I ของ ESBI)`);
  } else {
    out.push(
      `รายได้จากทรัพย์สิน ${money(r.passive)} ครอบคลุมรายจ่าย ${Math.floor(r.freedomPct)}% — รายได้ส่วนใหญ่ยังมาจากงาน (ฝั่ง E/S ของ ESBI)`,
    );
  }
  if (r.deals > 0) out.push(`เปิดดีล ${r.deals} ครั้ง ซื้อทรัพย์สิน ${r.assetBuys} ครั้ง ได้กระแสเงินสดเพิ่ม ${money(r.cashflowBought)}/เดือน`);
  if (r.declinedWithCash > 0) {
    out.push(`ปล่อยดีลที่มีเงินสดพอซื้อ ${r.declinedWithCash} ครั้ง — ลองทบทวนว่าไม่ซื้อเพราะดีลไม่ดี หรือเพราะกลัว`);
  }
  if (r.declinedWithLoan > 0) {
    out.push(`ไม่ซื้อ ${r.declinedWithLoan} ครั้งทั้งที่กู้เพิ่มแล้วซื้อได้ — ดีลที่กระแสเงินสดมากกว่าค่าผ่อนเงินกู้ คือการใช้หนี้ดี`);
  }
  if (r.goodDebt > 0) out.push(`กู้เพื่อลงทุน (หนี้ดี) ${money(r.goodDebt)}`);
  if (r.badDebt > 0) out.push(`กู้เพราะเงินไม่พอจ่าย/ไม่ได้เอาไปลงทุน (หนี้เสีย) ${money(r.badDebt)}`);
  if (r.stockProfit !== 0) out.push(`${r.stockProfit > 0 ? "กำไร" : "ขาดทุน"}จากหุ้น/ทอง ${money(Math.abs(r.stockProfit))}`);
  if (r.assetProfit !== 0) out.push(`ขายทรัพย์สิน${r.assetProfit > 0 ? "ได้กำไร" : "ขาดทุน"} ${money(Math.abs(r.assetProfit))} (เทียบกับเงินดาวน์)`);
  if (r.doodads > 0) out.push(`จ่ายของฟุ่มเฟือย/เรื่องไม่คาดฝันรวม ${money(r.doodads)}`);
  if (r.payoffs > 0) out.push(`ปิดหนี้ ${r.payoffs} ก้อน ลดรายจ่ายรายเดือน`);
  if (r.charityGiven > 0) out.push(`ทำบุญ ${r.charityGiven} ครั้ง`);
  if (r.paydayLost > 0) out.push(`ลืมกดรับเงินเดือน เสียไป ${money(r.paydayLost)}`);
  if (r.bankrupt > 0) out.push(`ล้มละลาย ${r.bankrupt} ครั้ง`);
  return out;
}

export function analyze(state: GameState, endedBy?: GameReport["endedBy"]): GameReport {
  const events = state.events ?? [];
  const players = state.players.map((p): PlayerReport => {
    const mine = events.filter((e) => e.p === p.id);
    const of = (k: GameEvent["k"]) => mine.filter((e) => e.k === k);
    const rollsList = of("roll");
    const fastEv = of("fast")[0];
    const escapeRoll = fastEv ? rollsList.filter((e) => e.n <= fastEv.n).length : null;

    // กู้แล้วซื้อในการทอยครั้งเดียวกัน = หนี้ดี
    const invests = new Set(mine.filter((e) => e.k === "buyAsset" || e.k === "buyStock" || e.k === "rightBuy").map((e) => e.n));
    const loans = of("loan");
    const goodDebt = sum(loans.filter((e) => invests.has(e.n)));
    const badDebt = sum(loans.filter((e) => !invests.has(e.n))) + sum(of("forcedLoan"));

    const declined = [...of("declineAsset"), ...of("declineStock")];
    const buys = [...of("buyAsset"), ...of("rightBuy")];
    // ค่านายหน้าที่ได้จากการขายสิทธิ์ (มีคนรับในการทอยเดียวกัน)
    const rightBuysByN = new Map(events.filter((e) => e.k === "rightBuy").map((e) => [e.n, e.pr ?? 0]));
    const rightIncome = of("sellRight").reduce((s, e) => s + (rightBuysByN.get(e.n) ?? 0), 0);

    const expenses = totalExpenses(p);
    const passive = passiveIncome(p);
    const base = {
      id: p.id,
      name: p.name,
      color: p.color,
      profession: PROFESSIONS[p.prof]?.name ?? "",
      won: state.winner === p.id,
      rolls: rollsList.length,
      escapeRoll,
      passive,
      expenses,
      cash: p.cash,
      freedomPct: p.fast ? 100 : expenses > 0 ? Math.min(100, (passive / expenses) * 100) : 100,
      deals: of("deal").length,
      assetBuys: buys.length,
      cashflowBought: buys.reduce((s, e) => s + (e.cf ?? 0), 0),
      stockBuys: of("buyStock").length,
      declinedWithCash: declined.filter((e) => e.a === "cash").length,
      declinedWithLoan: declined.filter((e) => e.a === "loan").length,
      declinedNoMoney: declined.filter((e) => e.a === "no").length,
      stockProfit: of("sellStock").reduce((s, e) => s + (e.pr ?? 0), 0),
      assetProfit: [...of("sellAsset"), ...of("forcedSale")].reduce((s, e) => s + (e.pr ?? 0), 0),
      goodDebt,
      badDebt,
      repaid: sum(of("repay")),
      payoffs: of("payoff").length,
      doodads: sum(of("doodad")) + sum(of("lend")) + sum(of("expense")),
      charityGiven: of("charity").length,
      charitySkipped: of("noCharity").length,
      paydayLost: sum(of("paydayLost")),
      bankrupt: of("bankrupt").length,
      rightIncome,
    };
    const withStyle = { ...base, style: styleOf(base) };
    return { ...withStyle, insights: insightsOf(withStyle) };
  });

  const start = state.startedAt ?? null;
  const end = state.endedAt ?? null;
  return {
    gameId: state.gameId ?? "",
    startedAt: start,
    endedAt: end,
    minutes: start && end ? Math.round((end - start) / 60_000) : null,
    rolls: state.rolls ?? 0,
    endedBy: endedBy ?? state.endedBy ?? "expired",
    winner: state.players.find((p) => p.id === state.winner)?.name ?? null,
    players,
  };
}

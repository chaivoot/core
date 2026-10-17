// คำนวณแผนธุรกิจแอมเวย์ตามคู่มือดำเนินธุรกิจ (บทที่ 2) และโปรแกรมคอร์พลัส ปีคุณสมบัติ 2569/70
// ทุกตัวเลขเป็นการคำนวณตามสูตรของบริษัทจากตัวเลขสมมติ ไม่ใช่การรับประกันรายได้

/** อัตราส่วน พีวี : บีวี (ตั้งแต่ 1 ม.ค. 2566) */
export const PV_TO_BV = 3.23;
/** กำไรขายปลีกโดยเฉลี่ย (ของราคานักธุรกิจ) */
export const RETAIL_PROFIT = 0.1;
export const TOP_PV = 150_000;
export const LEADER_RATE = 0.06;

/** ตารางส่วนลดประจำเดือน เรียงจากมากไปน้อย */
export const DISCOUNT_TABLE = [
  { pv: 150_000, bv: 484_500, rate: 21 },
  { pv: 90_000, bv: 290_700, rate: 18 },
  { pv: 55_000, bv: 177_650, rate: 15 },
  { pv: 30_000, bv: 96_900, rate: 12 },
  { pv: 15_000, bv: 48_450, rate: 9 },
  { pv: 5_000, bv: 16_150, rate: 6 },
  { pv: 2_500, bv: 8_075, rate: 3 },
] as const;

export function rateFor(pv: number): number {
  return DISCOUNT_TABLE.find((r) => pv >= r.pv)?.rate ?? 0;
}

/** ขั้นถัดไปของตารางส่วนลด (null ถ้าถึง 21% แล้ว) */
export function nextStep(pv: number) {
  const next = [...DISCOUNT_TABLE].reverse().find((r) => pv < r.pv);
  return next ? { ...next, missingPv: next.pv - pv } : null;
}

/** หนึ่งรหัสธุรกิจ: ยอดส่วนตัว (รวมลูกค้า) และคนที่สปอนเซอร์ */
export type PlanNode = {
  pv: number;
  bv: number;
  /** ส่วนของ bv ที่ขายให้ลูกค้า (ได้กำไรขายปลีก) */
  retailBv: number;
  children: PlanNode[];
};

export type NodeResult = {
  groupPv: number;
  groupBv: number;
  rate: number;
  /** ยอดกลุ่มส่วนตัว ไม่รวมสายที่ได้ 21% */
  personalGroupPv: number;
  retail: number;
  own: number;
  differential: number;
  /** ส่วนลดแตกต่างแยกตามสาย */
  legs: { groupPv: number; groupBv: number; rate: number; differential: number }[];
  leader: number;
  leaderLegs: number;
  /** ยอดที่หักออกตามหลักประกันขั้นต่ำ 6% (พีวี) */
  leaderDeductPv: number;
};

// ผังแบบ "ทุกคนทำเหมือนกัน" ใช้ object ซ้ำกันได้ จึงจำผลไว้ไม่ต้องคำนวณซ้ำ
const memo = new WeakMap<PlanNode, NodeResult>();

export function evaluate(node: PlanNode): NodeResult {
  const cached = memo.get(node);
  if (cached) return cached;

  const kids = node.children.map(evaluate);
  const groupPv = node.pv + kids.reduce((s, k) => s + k.groupPv, 0);
  const groupBv = node.bv + kids.reduce((s, k) => s + k.groupBv, 0);
  const rate = rateFor(groupPv);

  const top = kids.filter((k) => k.rate === 21);
  const rest = kids.filter((k) => k.rate !== 21);
  const personalGroupPv = node.pv + rest.reduce((s, k) => s + k.groupPv, 0);

  const legs = rest.map((k) => ({
    groupPv: k.groupPv,
    groupBv: k.groupBv,
    rate: k.rate,
    differential: (k.groupBv * Math.max(rate - k.rate, 0)) / 100,
  }));

  // ส่วนลดพิเศษผู้นำ 6% จากสายที่ได้ 21% โดยตรง
  // ทั้งหมด: กลุ่มส่วนตัว >= 150,000 / บางส่วน: >= 55,000 หรือมีสาย 21% ตั้งแต่ 2 สาย (หักหลักประกันขั้นต่ำ)
  let leader = 0;
  let leaderDeductPv = 0;
  if (top.length > 0) {
    const legPv = top.reduce((s, k) => s + k.personalGroupPv, 0);
    if (personalGroupPv >= TOP_PV) {
      leader = legPv * PV_TO_BV * LEADER_RATE;
    } else if (personalGroupPv >= 55_000 || top.length >= 2) {
      leaderDeductPv = Math.min(TOP_PV - personalGroupPv, legPv);
      leader = (legPv - leaderDeductPv) * PV_TO_BV * LEADER_RATE;
    }
  }

  const result: NodeResult = {
    groupPv,
    groupBv,
    rate,
    personalGroupPv,
    retail: node.retailBv * RETAIL_PROFIT,
    own: (node.bv * rate) / 100,
    differential: legs.reduce((s, l) => s + l.differential, 0),
    legs,
    leader,
    leaderLegs: top.length,
    leaderDeductPv,
  };
  memo.set(node, result);
  return result;
}

/** ส่วนลดประจำเดือน = ส่วนลดจากยอดซื้อส่วนตัว + ส่วนลดแตกต่าง (ฐานของรางวัลคอร์พลัส) */
export function monthlyDiscount(r: NodeResult) {
  return r.own + r.differential;
}

export type CorePlus = {
  goBronze: number;
  goBronzeLegs: number;
  /** ฐานของรางวัลบรอนซ์ = ส่วนลดประจำเดือน */
  base: number;
  /** บรอนซ์ฟาวน์เดชั่น 20% (0 = ยังไม่ผ่านเงื่อนไข) */
  foundation: number;
  /** บรอนซ์บิวเดอร์ 30% - ถึงบิวเดอร์ก็ได้ฟาวน์เดชั่นด้วย */
  builder: number;
  /** เงินรางวัลครั้งแรกที่ทำคุณสมบัติเข็มเงิน (21%) */
  newSilver: number;
};

/**
 * คอร์พลัส ปีคุณสมบัติ 2569/70 สำหรับนักธุรกิจช่วงเริ่มต้น
 * สมมติว่าทุกคนเพิ่งเริ่มธุรกิจ (สมัครไม่เกิน 6 เดือน ไม่เคยเป็นเข็มทอง ปีก่อนได้ไม่เกิน 12%)
 */
export function corePlus(node: PlanNode): CorePlus {
  const r = evaluate(node);
  const kids = node.children.map(evaluate);
  const ppvOk = node.pv >= 1_000;

  const goBronzeLegs = kids.filter((k) => k.groupPv >= 1_500).length;
  const goBronze = !ppvOk ? 0 : goBronzeLegs >= 3 ? 1_500 : goBronzeLegs === 2 ? 1_000 : 0;

  const base = monthlyDiscount(r);
  const foundationOk = ppvOk && r.rate >= 9 && kids.filter((k) => k.rate >= 3).length >= 3;
  const builderOk = ppvOk && r.rate >= 15 && kids.filter((k) => k.rate >= 6).length >= 3;

  return {
    goBronze,
    goBronzeLegs,
    base,
    foundation: foundationOk ? base * 0.2 : 0,
    builder: builderOk ? base * 0.3 : 0,
    newSilver: r.rate === 21 ? 10_000 : 0,
  };
}

/** คอร์พลัสต่อเดือนรวม (ไม่รวมเงินรางวัลครั้งเดียว) */
export function corePlusMonthly(cp: CorePlus) {
  return cp.goBronze + cp.foundation + cp.builder;
}

/** ยอดของหนึ่งบ้าน */
export type Household = { pv: number; bv: number; retailBv: number };

/**
 * ผังที่ทุกคนทำเหมือนกัน: เราสปอนเซอร์ levels[0] คน แต่ละคนสปอนเซอร์ต่อ levels[1] คน ...
 * customers = จำนวนลูกค้าที่ใช้สินค้าแบบเดียวกับบ้านเรา (นับรวมเป็นยอดของแต่ละรหัส)
 */
export function uniformTree(home: Household, customers: number, levels: number[]): PlanNode {
  const unit = {
    pv: home.pv * (1 + customers),
    bv: home.bv * (1 + customers),
    retailBv: home.retailBv + home.bv * customers,
  };
  let node: PlanNode = { ...unit, children: [] };
  for (let i = levels.length - 1; i >= 0; i--) {
    const child = node;
    node = { ...unit, children: Array.from({ length: Math.max(levels[i], 0) }, () => child) };
  }
  return node;
}

/** ผลรวมรายได้ต่อเดือนตามแผนหลัก (ไม่รวมคอร์พลัส) */
export function planIncome(r: NodeResult) {
  return r.retail + r.own + r.differential + r.leader;
}

export type ProductUse = { price: number; pv: number; bv: number; days: number; qty: number };

/** ยอดต่อเดือน (30 วัน) จากสินค้าที่เลือก */
export function basketPerMonth(items: ProductUse[]) {
  let day = 0;
  let pv = 0;
  let bv = 0;
  for (const it of items) {
    if (it.days <= 0 || it.qty <= 0) continue;
    const perMonth = (30 / it.days) * it.qty;
    day += (it.price / it.days) * it.qty;
    pv += it.pv * perMonth;
    bv += it.bv * perMonth;
  }
  return { perDay: day, price: day * 30, pv, bv };
}

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

/** ตัวเลขทศนิยมไม่เกิน 2 ตำแหน่ง */
export const fmt = (n: number) => thb.format(Math.round(n * 100) / 100);
/** ตัวเลขปัดเป็นจำนวนเต็ม */
export const fmt0 = (n: number) => whole.format(Math.round(n));

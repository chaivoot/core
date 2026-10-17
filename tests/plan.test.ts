import { describe, expect, it } from "vitest";
import {
  basketPerMonth,
  corePlus,
  evaluate,
  nextStep,
  planIncome,
  PV_TO_BV,
  rateFor,
  uniformTree,
  type PlanNode,
} from "@/lib/plan";

// ตัวอย่างในคู่มือใช้ยอดเป็นบีวี (บาท) และรวมกำไรขายปลีก 18,000 × 10% = 1,800 บาทไว้ด้วย
// ระบบไม่คิดกำไรขายปลีก (สมาชิกซื้อราคาเดียวกับเรา) จึงเทียบกับยอดในคู่มือหักออก 1,800
const RETAIL = 1_800;
const sold = (bv: number) => ({ pv: bv / PV_TO_BV, bv });
const pvNode = (pv: number, children: PlanNode[] = []): PlanNode => ({
  pv,
  bv: pv * PV_TO_BV,
  children,
});

describe("ตารางส่วนลด", () => {
  it("หาเปอร์เซ็นต์จากพีวี", () => {
    expect(rateFor(2_499)).toBe(0);
    expect(rateFor(2_500)).toBe(3);
    expect(rateFor(29_999)).toBe(9);
    expect(rateFor(150_000)).toBe(21);
    expect(nextStep(11_192)).toMatchObject({ rate: 9, missingPv: 3_808 });
    expect(nextStep(200_000)).toBeNull();
  });
});

describe("ตัวอย่างในคู่มือดำเนินธุรกิจ บทที่ 2", () => {
  it("สปอนเซอร์ 3 คน คนละ 18,000 บีวี = 5,040 บาท", () => {
    const r = evaluate(uniformTree(sold(18_000), 0, [3]));
    expect(r.rate).toBe(9);
    expect([r.own, r.differential]).toEqual([1_620, 1_620]);
    expect(planIncome(r) + RETAIL).toBe(5_040);
  });

  it("แต่ละสาย 72,000 บีวี = 17,460 บาท", () => {
    const r = evaluate(uniformTree(sold(18_000), 0, [3, 3]));
    expect(r.rate).toBe(15);
    expect(planIncome(r) + RETAIL).toBeCloseTo(17_460, 6);
  });

  it("แต่ละสาย 234,000 บีวี = 47,700 บาท", () => {
    const r = evaluate(uniformTree(sold(18_000), 0, [3, 3, 3]));
    expect(r.rate).toBe(21);
    expect(planIncome(r) + RETAIL).toBeCloseTo(47_700, 6);
  });

  it("ถ่ายทอดแบบอย่าง 7 x 7 = 96,300 บาท", () => {
    const r = evaluate(uniformTree(sold(18_000), 0, [7, 7]));
    expect(r.legs[0].rate).toBe(12);
    expect(planIncome(r) + RETAIL).toBeCloseTo(96_300, 6);
  });

  it("ส่วนลดพิเศษผู้นำ 6% จาก 3 สาย และ 7 สาย", () => {
    const leg = () => pvNode(150_000);
    expect(evaluate(pvNode(150_000, [leg(), leg(), leg()])).leader).toBeCloseTo(87_210, 6);
    expect(evaluate(pvNode(150_000, Array.from({ length: 7 }, leg))).leader).toBeCloseTo(203_490, 6);
  });
});

describe("หลักประกันขั้นต่ำ 6%", () => {
  it("กลุ่มส่วนตัว 55,000 หักส่วนที่ขาด 95,000", () => {
    const r = evaluate(pvNode(55_000, [pvNode(150_000)]));
    expect(r.leaderDeductPv).toBe(95_000);
    expect(r.leader).toBeCloseTo((150_000 - 95_000) * PV_TO_BV * 0.06, 6);
  });

  it("0 พีวี แต่มีสาย 21% สองสาย", () => {
    const r = evaluate(pvNode(0, [pvNode(150_000), pvNode(150_000)]));
    expect(r.leader).toBeCloseTo(150_000 * PV_TO_BV * 0.06, 6);
  });

  it("ต่ำกว่า 55,000 และมีสาย 21% สายเดียว ไม่ได้รับ", () => {
    expect(evaluate(pvNode(54_999, [pvNode(150_000)])).leader).toBe(0);
  });
});

describe("คอร์พลัส 2569/70", () => {
  it("บรอนซ์ฟาวน์เดชั่น ตามตัวอย่าง (8,721 บาท)", () => {
    const me = pvNode(15_000, [pvNode(4_000), pvNode(4_000), pvNode(4_000), pvNode(2_000)]);
    const r = evaluate(me);
    expect(r.own + r.differential).toBeCloseTo(7_267.5, 6);
    expect(corePlus(me).foundation).toBeCloseTo(1_453.5, 6);
    expect(corePlus(me).builder).toBe(0);
  });

  it("บรอนซ์บิวเดอร์ ตามตัวอย่าง (46,230.99 บาท)", () => {
    const me = pvNode(53_000, [pvNode(10_000), pvNode(10_000), pvNode(10_000), pvNode(3_000)]);
    const r = evaluate(me);
    expect(r.own + r.differential).toBeCloseTo(35_562.3, 6);
    expect(corePlus(me).builder).toBeCloseTo(10_668.69, 6);
    // ถึงบรอนซ์บิวเดอร์ ก็ได้บรอนซ์ฟาวน์เดชั่นด้วย
    expect(corePlus(me).foundation).toBeCloseTo(7_112.46, 6);
  });

  it("โก-บรอนซ์ 2 รหัส 1,000 / 3 รหัส 1,500", () => {
    expect(corePlus(pvNode(1_000, [pvNode(1_500), pvNode(1_500)])).goBronze).toBe(1_000);
    expect(corePlus(pvNode(1_000, [pvNode(1_500), pvNode(1_500), pvNode(1_500)])).goBronze).toBe(1_500);
    expect(corePlus(pvNode(999, [pvNode(1_500), pvNode(1_500)])).goBronze).toBe(0);
  });
});

describe("เลือกสินค้า", () => {
  it("ชุดอาหารเช้า 2 ชุด ใช้ 30 วัน", () => {
    const b = basketPerMonth([{ price: 9_039, pv: 2_798, bv: 9_039, days: 30, qty: 2 }]);
    expect(b.perDay).toBeCloseTo(602.6, 6);
    expect(b.pv).toBe(5_596);
    expect(b.bv).toBe(18_078);
  });
});

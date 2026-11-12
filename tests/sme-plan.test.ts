import { describe, expect, it } from "vitest";
import { loanPayment, plan, SURVIVAL_AVG_10Y, survivalChance, TEMPLATES, type PlanInput } from "@/lib/sme/plan";

const base = (over: Partial<PlanInput> = {}): PlanInput => {
  const t = TEMPLATES[0];
  return {
    setup: t.setup,
    monthly: t.monthly,
    margin: t.margin,
    ownSpace: false,
    ownerPay: 15_000,
    runwayMonths: 6,
    family: 0,
    loan: 0,
    savingsNow: 0,
    savePerMonth: 10_000,
    saveGrowth: 0,
    returnRate: 0,
    inflation: 0,
    targetYears: 10,
    ...over,
  };
};

describe("แผนเริ่มธุรกิจ", () => {
  it("เงินที่ต้องมี = เงินลงทุนเริ่มต้น + เงินหมุนเวียน × จำนวนเดือน", () => {
    const r = plan(base());
    expect(r.setupTotal).toBe(795_000);
    expect(r.monthlyBusiness).toBe(70_000);
    expect(r.monthlyBurn).toBe(85_000);
    expect(r.needToday).toBe(795_000 + 6 * 85_000);
  });

  it("มีที่/ตึกของตัวเอง ไม่มีค่าเช่าและเงินมัดจำ", () => {
    const r = plan(base({ ownSpace: true }));
    expect(r.setupTotal).toBe(795_000 - 75_000);
    expect(r.monthlyBusiness).toBe(70_000 - 25_000);
  });

  it("ไม่มีดอกเบี้ย ไม่มีเงินเฟ้อ: จำนวนปีที่เก็บพอ = ยอดที่ต้องเก็บ ÷ เงินเก็บต่อปี", () => {
    const r = plan(base({ family: 105_000 })); // ต้องเก็บเอง 1,200,000
    expect(r.ownNeedToday).toBe(1_200_000);
    expect(r.yearsToReady).toBe(10);
    expect(r.readyPct).toBeCloseTo(100);
    expect(r.savePerMonthNeeded).toBeCloseTo(10_000, 0);
  });

  it("เก็บไม่พอตามเป้า: บอก % ที่พร้อม และเงินที่ต้องเก็บต่อเดือน", () => {
    const r = plan(base({ targetYears: 5, family: 105_000 }));
    expect(r.readyPct).toBeCloseTo(50);
    expect(r.savePerMonthNeeded).toBeCloseTo(20_000, 0);
  });

  it("เงินเฟ้อทำให้ต้องใช้เงินมากขึ้นในอนาคต", () => {
    const r = plan(base({ inflation: 3 }));
    expect(r.needAtTarget).toBeCloseTo(r.needToday * 1.03 ** 10, 0);
  });

  it("จุดคุ้มทุน = ค่าใช้จ่ายต่อเดือน ÷ กำไรขั้นต้น", () => {
    const r = plan(base());
    expect(r.breakEvenSales).toBeCloseTo(85_000 / 0.65);
  });

  it("เก็บไม่ไหวภายใน 40 ปี = null", () => {
    expect(plan(base({ savePerMonth: 0 })).yearsToReady).toBeNull();
  });
});

describe("survivalChance", () => {
  const keys = ["runway", "debt", "breakeven", "experience", "tested", "customers"] as const;
  it("ranges from 15% (nothing ready) to 70% (all ready), average in between", () => {
    expect(survivalChance(keys.map((key) => ({ key, ok: false })))).toBe(15);
    expect(survivalChance(keys.map((key) => ({ key, ok: true })))).toBe(70);
    const half = survivalChance(keys.map((key, i) => ({ key, ok: i % 2 === 0 })));
    expect(half).toBeGreaterThan(SURVIVAL_AVG_10Y - 10);
    expect(half).toBeLessThan(SURVIVAL_AVG_10Y + 15);
  });
});

describe("loan payment", () => {
  it("matches a standard amortised payment", () => {
    // 500,000 บาท 7% 5 ปี ≈ 9,901 บาท/เดือน
    expect(Math.round(loanPayment(500_000, 7, 5))).toBe(9901);
    expect(loanPayment(120_000, 0, 1)).toBe(10_000);
    expect(loanPayment(0)).toBe(0);
  });
  it("adds the payment to monthly costs, runway and break-even", () => {
    const without = plan(base());
    const withLoan = plan(base({ loan: 500_000, loanRate: 7, loanYears: 5 }));
    expect(withLoan.loanMonthly).toBeCloseTo(loanPayment(500_000, 7, 5));
    expect(withLoan.monthlyBusiness - without.monthlyBusiness).toBeCloseTo(withLoan.loanMonthly);
    expect(withLoan.runwayTotal).toBeGreaterThan(without.runwayTotal);
    expect(withLoan.breakEvenSales).toBeGreaterThan(without.breakEvenSales);
  });
});

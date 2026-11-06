import { describe, expect, it } from "vitest";
import { plan, TEMPLATES, type PlanInput } from "@/lib/sme/plan";

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

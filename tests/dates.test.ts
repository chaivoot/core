import { describe, expect, it } from "vitest";
import {
  canEditActivityDate,
  canEditWeek,
  dateInBangkok,
  monthDateRange,
  monthOfDate,
  monthOfWeek,
  shiftMonth,
  weekStartOf,
  weeksOfMonth,
} from "@/lib/dates";

describe("สัปดาห์ อาทิตย์ - เสาร์", () => {
  it("หาวันอาทิตย์ของสัปดาห์", () => {
    expect(weekStartOf("2026-09-27")).toBe("2026-09-27"); // อาทิตย์
    expect(weekStartOf("2026-10-03")).toBe("2026-09-27"); // เสาร์
    expect(weekStartOf("2026-10-01")).toBe("2026-09-27");
  });

  it("สัปดาห์คร่อมเดือนนับเป็นเดือนของวันเสาร์ (ตัวอย่างในสเปก)", () => {
    expect(monthOfWeek("2026-09-27")).toBe("2026-10");
    expect(monthOfDate("2026-09-28")).toBe("2026-10");
    expect(monthOfDate("2026-09-26")).toBe("2026-09");
  });

  it("สัปดาห์ของเดือน", () => {
    expect(weeksOfMonth("2026-10")).toEqual([
      "2026-09-27",
      "2026-10-04",
      "2026-10-11",
      "2026-10-18",
      "2026-10-25",
    ]);
    expect(weeksOfMonth("2026-09")).toEqual([
      "2026-08-30",
      "2026-09-06",
      "2026-09-13",
      "2026-09-20",
    ]);
    expect(monthDateRange("2026-10")).toEqual({ from: "2026-09-27", to: "2026-10-31" });
  });

  it("เลื่อนเดือนข้ามปี", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("กฎแก้ไขย้อนหลัง 30 วัน", () => {
  it("คะแนนรายสัปดาห์นับจากวันเสาร์ที่ปิดสัปดาห์", () => {
    // สัปดาห์ 27 ก.ย. - 3 ต.ค. แก้ได้ถึง 2 พ.ย.
    expect(canEditWeek("2026-09-27", "2026-11-02")).toBe(true);
    expect(canEditWeek("2026-09-27", "2026-11-03")).toBe(false);
    expect(canEditWeek("2026-09-27", "2026-09-27")).toBe(true);
    expect(canEditWeek("2026-10-04", "2026-10-03")).toBe(false); // สัปดาห์ในอนาคต
  });

  it("กิจกรรมนับจากวันที่กิจกรรม", () => {
    expect(canEditActivityDate("2026-08-28", "2026-09-27")).toBe(true);
    expect(canEditActivityDate("2026-08-27", "2026-09-27")).toBe(false);
    expect(canEditActivityDate("2026-10-10", "2026-09-27")).toBe(true);
  });
});

describe("เวลาประเทศไทย", () => {
  it("แปลงเวลาเป็นวันที่ไทย", () => {
    expect(dateInBangkok(new Date("2026-09-26T17:30:00Z"))).toBe("2026-09-27");
    expect(dateInBangkok(new Date("2026-09-26T16:59:00Z"))).toBe("2026-09-26");
  });
});

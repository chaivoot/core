import { describe, expect, it } from "vitest";
import type { WeeklyReview } from "@/lib/db/schema";
import { summarizeMonth } from "@/lib/summary";

function review(weekStart: string, s: [number | null, number | null, number | null, number | null]) {
  return {
    weekStart,
    priorityScore: s[0],
    productsScore: s[1],
    learningScore: s[2],
    actionScore: s[3],
  } as WeeklyReview;
}

describe("สรุปรายเดือน", () => {
  const userCreatedAt = new Date("2026-01-01T00:00:00Z");

  it("สัปดาห์ที่จบแล้วแต่ไม่ได้กรอก นับเป็น 0", () => {
    const s = summarizeMonth({
      month: "2026-09",
      today: "2026-10-10",
      userCreatedAt,
      reviews: [review("2026-08-30", [10, 10, 10, 10]), review("2026-09-13", [5, 5, 5, 5])],
    });
    expect(s.countedWeeks).toBe(4);
    expect(s.filledWeeks).toBe(2);
    expect(s.average).toBe((40 + 20) / 4);
    expect(s.categoryAverages.priorityScore).toBe(15 / 4);
  });

  it("ไม่นับสัปดาห์ในอนาคตและสัปดาห์ปัจจุบันที่ยังไม่กรอก", () => {
    const s = summarizeMonth({
      month: "2026-10",
      today: "2026-10-06",
      userCreatedAt,
      reviews: [review("2026-09-27", [8, 8, 8, 8])],
    });
    expect(s.weeks.map((w) => w.status)).toEqual([
      "filled",
      "in_progress",
      "future",
      "future",
      "future",
    ]);
    expect(s.average).toBe(32);
  });

  it("สัปดาห์ปัจจุบันที่กรอกแล้วนับด้วย", () => {
    const s = summarizeMonth({
      month: "2026-10",
      today: "2026-10-06",
      userCreatedAt,
      reviews: [review("2026-09-27", [8, 8, 8, 8]), review("2026-10-04", [4, 4, null, null])],
    });
    expect(s.countedWeeks).toBe(2);
    expect(s.average).toBe((32 + 8) / 2);
  });

  it("ไม่นับสัปดาห์ก่อนเริ่มใช้งาน", () => {
    const s = summarizeMonth({
      month: "2026-09",
      today: "2026-10-10",
      userCreatedAt: new Date("2026-09-15T03:00:00Z"),
      reviews: [],
    });
    expect(s.weeks.map((w) => w.status)).toEqual([
      "before_start",
      "before_start",
      "missing",
      "missing",
    ]);
    expect(s.average).toBe(0);
  });
});

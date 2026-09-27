import type { WeeklyReview } from "@/lib/db/schema";
import { dateInBangkok, weekEndOf, weekStartOf, weeksOfMonth } from "@/lib/dates";

export type WeekStatus =
  | "filled" // มีคะแนน (นับในค่าเฉลี่ย)
  | "missing" // สัปดาห์จบแล้วแต่ไม่ได้กรอก (นับเป็น 0)
  | "in_progress" // สัปดาห์ปัจจุบันยังไม่ได้กรอก (ยังไม่นับ)
  | "future" // ยังไม่ถึง (ไม่นับ)
  | "before_start"; // ก่อนเริ่มใช้งานระบบ (ไม่นับ)

export type CategoryScores = {
  priorityScore: number;
  productsScore: number;
  learningScore: number;
  actionScore: number;
};

export type WeekSummary = {
  weekStart: string;
  status: WeekStatus;
  counted: boolean;
  scores: CategoryScores;
  total: number;
  complete: boolean;
};

const KEYS = ["priorityScore", "productsScore", "learningScore", "actionScore"] as const;

/**
 * สรุปรายเดือน: ค่าเฉลี่ยของคะแนนรวมรายสัปดาห์ (เต็ม 40)
 * สัปดาห์ที่จบแล้วแต่ไม่ได้กรอก นับเป็น 0
 * ไม่นับสัปดาห์ในอนาคต สัปดาห์ปัจจุบันที่ยังไม่ได้กรอก และสัปดาห์ก่อนเริ่มใช้งาน
 */
export function summarizeMonth(input: {
  month: string;
  today: string;
  userCreatedAt: Date;
  reviews: WeeklyReview[];
}) {
  const startWeek = weekStartOf(dateInBangkok(input.userCreatedAt));
  const byWeek = new Map(input.reviews.map((r) => [r.weekStart, r]));

  const weeks: WeekSummary[] = weeksOfMonth(input.month).map((weekStart) => {
    const review = byWeek.get(weekStart);
    const scores: CategoryScores = {
      priorityScore: review?.priorityScore ?? 0,
      productsScore: review?.productsScore ?? 0,
      learningScore: review?.learningScore ?? 0,
      actionScore: review?.actionScore ?? 0,
    };
    const hasScore = !!review && KEYS.some((k) => review[k] !== null);
    const complete = !!review && KEYS.every((k) => review[k] !== null);

    let status: WeekStatus;
    if (hasScore) status = "filled";
    else if (weekStart > input.today) status = "future";
    else if (weekEndOf(weekStart) < startWeek) status = "before_start";
    else if (weekEndOf(weekStart) >= input.today) status = "in_progress";
    else status = "missing";

    return {
      weekStart,
      status,
      counted: status === "filled" || status === "missing",
      scores,
      total: KEYS.reduce((s, k) => s + scores[k], 0),
      complete,
    };
  });

  const counted = weeks.filter((w) => w.counted);
  const n = counted.length;
  const avg = (fn: (w: WeekSummary) => number) =>
    n === 0 ? null : counted.reduce((s, w) => s + fn(w), 0) / n;

  return {
    weeks,
    countedWeeks: n,
    filledWeeks: weeks.filter((w) => w.status === "filled").length,
    average: avg((w) => w.total),
    categoryAverages: {
      priorityScore: avg((w) => w.scores.priorityScore),
      productsScore: avg((w) => w.scores.productsScore),
      learningScore: avg((w) => w.scores.learningScore),
      actionScore: avg((w) => w.scores.actionScore),
    },
  };
}

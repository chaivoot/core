import "server-only";
import { and, between, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { ActivityType, WeeklyReview } from "@/lib/db/schema";
import { monthDateRange, monthOfWeek, weekEndOf } from "@/lib/dates";

export type ReviewPatch = Partial<
  Omit<WeeklyReview, "id" | "userId" | "weekStart" | "createdAt" | "updatedAt">
>;

export async function getReview(userId: string, weekStart: string) {
  const [row] = await db
    .select()
    .from(schema.weeklyReviews)
    .where(
      and(
        eq(schema.weeklyReviews.userId, userId),
        eq(schema.weeklyReviews.weekStart, weekStart),
      ),
    );
  return row ?? null;
}

export async function getReviews(userId: string, weekStarts: string[]) {
  if (weekStarts.length === 0) return [];
  return db
    .select()
    .from(schema.weeklyReviews)
    .where(
      and(
        eq(schema.weeklyReviews.userId, userId),
        inArray(schema.weeklyReviews.weekStart, weekStarts),
      ),
    );
}

export async function saveReview(userId: string, weekStart: string, patch: ReviewPatch) {
  await db
    .insert(schema.weeklyReviews)
    .values({ userId, weekStart, ...patch })
    .onConflictDoUpdate({
      target: [schema.weeklyReviews.userId, schema.weeklyReviews.weekStart],
      set: { ...patch, updatedAt: sql`now()` },
    });
}

export const CATEGORY_SCORE_KEYS = [
  "priorityScore",
  "productsScore",
  "learningScore",
  "actionScore",
] as const;

export function reviewTotal(review: WeeklyReview | null | undefined): number {
  if (!review) return 0;
  return CATEGORY_SCORE_KEYS.reduce((sum, k) => sum + (review[k] ?? 0), 0);
}

export function isReviewComplete(review: WeeklyReview | null | undefined): boolean {
  return !!review && CATEGORY_SCORE_KEYS.every((k) => review[k] !== null);
}

/** ข้อมูลประกอบการทบทวนหมวด 4 ดึงจากระบบรายชื่อ */
export async function getActionStats(userId: string, weekStart: string) {
  const weekEnd = weekEndOf(weekStart);
  const monthFrom = monthDateRange(monthOfWeek(weekStart)).from;

  const [contactCounts] = await db
    .select({
      week: sql<number>`count(*) filter (where ${schema.contacts.addedOn} >= ${weekStart})`.mapWith(Number),
      month: sql<number>`count(*)`.mapWith(Number),
    })
    .from(schema.contacts)
    .where(
      and(
        eq(schema.contacts.userId, userId),
        between(schema.contacts.addedOn, monthFrom, weekEnd),
      ),
    );

  const activityRows = await db
    .select({
      type: schema.activities.type,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(schema.activities)
    .where(
      and(
        eq(schema.activities.userId, userId),
        between(schema.activities.date, weekStart, weekEnd),
      ),
    )
    .groupBy(schema.activities.type);

  const activityCounts: Record<ActivityType, number> = {
    appointment: 0,
    product_intro: 0,
    business_plan: 0,
    follow_up: 0,
  };
  for (const r of activityRows) activityCounts[r.type] = r.count;

  return {
    newContactsThisWeek: contactCounts?.week ?? 0,
    newContactsMonthToDate: contactCounts?.month ?? 0,
    activityCounts,
  };
}

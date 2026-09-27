// วันที่ทั้งระบบใช้รูปแบบ "YYYY-MM-DD" ตามเวลาประเทศไทย
// สัปดาห์: อาทิตย์ - เสาร์ / สัปดาห์นับเป็นของเดือนที่วันเสาร์ (วันปิดสัปดาห์) อยู่

export const TIME_ZONE = "Asia/Bangkok";
export const EDIT_WINDOW_DAYS = 30;
export const MONTHLY_NEW_CONTACT_GOAL = 10;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = toUtc(value);
  return !Number.isNaN(d.getTime()) && fromUtc(d) === value;
}

export function isValidMonth(value: string): boolean {
  return MONTH_RE.test(value) && isValidDate(`${value}-01`);
}

/** วันนี้ตามเวลาประเทศไทย */
export function today(now: Date = new Date()): string {
  return dateInBangkok(now);
}

export function dateInBangkok(instant: Date): string {
  // en-CA ให้รูปแบบ YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** 0 = อาทิตย์ ... 6 = เสาร์ */
export function dayOfWeek(date: string): number {
  return toUtc(date).getUTCDay();
}

export function weekStartOf(date: string): string {
  return addDays(date, -dayOfWeek(date));
}

export function weekEndOf(weekStart: string): string {
  return addDays(weekStart, 6);
}

export function isWeekStart(date: string): boolean {
  return isValidDate(date) && dayOfWeek(date) === 0;
}

/** เดือน (YYYY-MM) ที่สัปดาห์นี้สังกัด = เดือนของวันเสาร์ */
export function monthOfWeek(weekStart: string): string {
  return weekEndOf(weekStart).slice(0, 7);
}

/** เดือนที่วันที่นี้สังกัด ตามกติกาสัปดาห์คร่อมเดือน */
export function monthOfDate(date: string): string {
  return monthOfWeek(weekStartOf(date));
}

/** วันอาทิตย์ของทุกสัปดาห์ที่นับเป็นของเดือนนี้ */
export function weeksOfMonth(month: string): string[] {
  const first = `${month}-01`;
  // วันเสาร์แรกของเดือน
  let saturday = addDays(first, (6 - dayOfWeek(first) + 7) % 7);
  const weeks: string[] = [];
  while (saturday.slice(0, 7) === month) {
    weeks.push(addDays(saturday, -6));
    saturday = addDays(saturday, 7);
  }
  return weeks;
}

/** ช่วงวันที่ (รวมหัวท้าย) ที่นับเป็นของเดือนนี้ */
export function monthDateRange(month: string): { from: string; to: string } {
  const weeks = weeksOfMonth(month);
  return { from: weeks[0], to: weekEndOf(weeks[weeks.length - 1]) };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return fromUtc(d).slice(0, 7);
}

/** คะแนนรายสัปดาห์: ให้คะแนนได้ตั้งแต่สัปดาห์เริ่ม จนถึง 30 วันหลังวันเสาร์ที่ปิดสัปดาห์ */
export function canEditWeek(weekStart: string, now: string = today()): boolean {
  return (
    weekStart <= now && now <= addDays(weekEndOf(weekStart), EDIT_WINDOW_DAYS)
  );
}

/** กิจกรรม: แก้ไข/เพิ่มได้ถ้าวันที่กิจกรรมไม่เก่ากว่า 30 วัน */
export function canEditActivityDate(date: string, now: string = today()): boolean {
  return date >= addDays(now, -EDIT_WINDOW_DAYS);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

// ---------- การแสดงผลภาษาไทย ----------

const thDay = new Intl.DateTimeFormat("th-TH", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const thDayYear = new Intl.DateTimeFormat("th-TH", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const thMonthYear = new Intl.DateTimeFormat("th-TH", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

export function formatDate(date: string): string {
  return thDayYear.format(toUtc(date));
}

export function formatDateShort(date: string): string {
  return thDay.format(toUtc(date));
}

export function formatWeek(weekStart: string): string {
  const end = weekEndOf(weekStart);
  return `${thDay.format(toUtc(weekStart))} – ${thDayYear.format(toUtc(end))}`;
}

export function formatMonth(month: string): string {
  return thMonthYear.format(toUtc(`${month}-01`));
}

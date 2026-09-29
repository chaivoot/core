import type { ActivityType, Interest } from "@/lib/db/schema";

export const INTEREST_LABELS: Record<Interest, string> = {
  product: "สินค้า",
  business: "ธุรกิจ",
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  appointment: "นัดหมาย",
  product_intro: "แนะนำสินค้า",
  business_plan: "เล่าแผนธุรกิจ",
  follow_up: "ติดตาม",
};

export const ACTIVITY_TYPES = Object.keys(ACTIVITY_LABELS) as ActivityType[];

export const CATEGORIES = [
  { step: 1, key: "priorityScore", title: "Priority", tab: "สมัคร" },
  { step: 2, key: "productsScore", title: "สินค้า", tab: "สินค้า" },
  { step: 3, key: "learningScore", title: "การเรียนรู้", tab: "เรียนรู้" },
  { step: 4, key: "actionScore", title: "ลงมือทำธุรกิจ", tab: "ลงมือทำ" },
] as const;

export const LEARNING_ITEMS = [
  { key: "learnListen", detailKey: "learnListenDetail", label: "ฟัง link", placeholder: "เช่น ลิงก์ YouTube / podcast" },
  { key: "learnRead", detailKey: "learnReadDetail", label: "อ่านหนังสือ", placeholder: "เช่น ชื่อหนังสือ" },
  { key: "learnMeeting", detailKey: "learnMeetingDetail", label: "เข้างานประชุม", placeholder: "เช่น ชื่องาน / งานใหญ่" },
  { key: "learnAcademy", detailKey: "learnAcademyDetail", label: "อบรมสินค้า (Academy)", placeholder: "รายละเอียด" },
] as const;

export const TEAM_STATUSES = [
  { value: "none", label: "ไม่มีสถานะ", short: "", tab: "ไม่มี" },
  { value: "product", label: "ใช้สินค้า", short: "สินค้า", tab: "สินค้า" },
  { value: "sop", label: "มี SOP", short: "SOP", tab: "SOP" },
  { value: "business", label: "ทำธุรกิจ", short: "ธุรกิจ", tab: "ธุรกิจ" },
  { value: "forty", label: "ทำ 40 ได้เอง", short: "40", tab: "40 ได้เอง" },
] as const;

export const TEAM_STATUS_LABELS = Object.fromEntries(
  TEAM_STATUSES.map((s) => [s.value, s.label]),
) as Record<(typeof TEAM_STATUSES)[number]["value"], string>;

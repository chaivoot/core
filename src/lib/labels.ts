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
  { step: 1, key: "priorityScore", title: "Priority" },
  { step: 2, key: "productsScore", title: "สินค้า" },
  { step: 3, key: "learningScore", title: "การเรียนรู้" },
  { step: 4, key: "actionScore", title: "ลงมือทำธุรกิจ" },
] as const;

export const LEARNING_ITEMS = [
  { key: "learnListen", detailKey: "learnListenDetail", label: "ฟัง link", placeholder: "เช่น ลิงก์ YouTube / podcast" },
  { key: "learnRead", detailKey: "learnReadDetail", label: "อ่านหนังสือ", placeholder: "เช่น ชื่อหนังสือ" },
  { key: "learnMeeting", detailKey: "learnMeetingDetail", label: "เข้างานประชุม", placeholder: "เช่น ชื่องาน / งานใหญ่" },
  { key: "learnAcademy", detailKey: "learnAcademyDetail", label: "อบรมสินค้า (Academy)", placeholder: "รายละเอียด" },
] as const;

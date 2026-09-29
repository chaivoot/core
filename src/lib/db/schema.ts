import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ทุกตารางที่เป็นข้อมูลของผู้ใช้มี user_id และทุก query ต้องกรองด้วย user_id เสมอ
// Phase 2 (สายงาน): เพิ่มตารางความสัมพันธ์ระหว่าง users ภายหลังได้โดยไม่ต้องแก้ตารางเดิม

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineUserId: text("line_user_id").notNull().unique(),
  name: text("name"),
  image: text("image"),
  /**
   * ใช้ผังสายงานร่วมกับคู่ (ธุรกิจเดียวกัน คนละบัญชี LINE):
   * ถ้าไม่ว่าง = ใช้ผังของผู้ใช้คนนี้แทนผังของตัวเอง (ผังเดิมไม่ถูกลบ แค่ซ่อน)
   * คะแนนและรายชื่อยังแยกเป็นของแต่ละคนเสมอ
   */
  teamOwnerId: uuid("team_owner_id").references((): AnyPgColumn => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** ลิงก์เชิญคู่มาใช้ผังสายงานร่วมกัน (ใช้ได้ครั้งเดียว มีวันหมดอายุ) */
export const teamInvites = pgTable("team_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  inviterId: uuid("inviter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedBy: uuid("used_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const score = (name: string) => smallint(name);

export const weeklyReviews = pgTable(
  "weekly_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** วันอาทิตย์ที่เริ่มสัปดาห์ */
    weekStart: date("week_start").notNull(),

    // หมวด 1: Priority - อันดับ 1-3 (1 = สำคัญที่สุด)
    priorityRank: smallint("priority_rank"),
    priorityScore: score("priority_score"),

    // หมวด 2: สินค้า
    productsUsed: boolean("products_used").notNull().default(false),
    productsScore: score("products_score"),

    // หมวด 3: การเรียนรู้
    learnListen: boolean("learn_listen").notNull().default(false),
    learnListenDetail: text("learn_listen_detail"),
    learnRead: boolean("learn_read").notNull().default(false),
    learnReadDetail: text("learn_read_detail"),
    learnMeeting: boolean("learn_meeting").notNull().default(false),
    learnMeetingDetail: text("learn_meeting_detail"),
    learnAcademy: boolean("learn_academy").notNull().default(false),
    learnAcademyDetail: text("learn_academy_detail"),
    learningScore: score("learning_score"),

    // หมวด 4: ลงมือทำธุรกิจ
    teamWork: boolean("team_work").notNull().default(false),
    teamWorkDetail: text("team_work_detail"),
    actionScore: score("action_score"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("weekly_reviews_user_week_idx").on(t.userId, t.weekStart),
    check("priority_rank_range", sql`${t.priorityRank} between 1 and 3`),
    check("priority_score_range", sql`${t.priorityScore} between 0 and 10`),
    check("products_score_range", sql`${t.productsScore} between 0 and 10`),
    check("learning_score_range", sql`${t.learningScore} between 0 and 10`),
    check("action_score_range", sql`${t.actionScore} between 0 and 10`),
  ],
);

export const interestEnum = pgEnum("interest", ["product", "business"]);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    channel: text("channel"),
    interest: interestEnum("interest"),
    note: text("note"),
    /** วันที่เพิ่มรายชื่อ (เวลาไทย) ใช้นับเป้ารายชื่อใหม่ */
    addedOn: date("added_on").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contacts_user_added_idx").on(t.userId, t.addedOn)],
);

export const activityTypeEnum = pgEnum("activity_type", [
  "appointment",
  "product_intro",
  "business_plan",
  "follow_up",
]);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    date: date("date").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("activities_user_date_idx").on(t.userId, t.date),
    index("activities_contact_idx").on(t.contactId, t.date),
  ],
);

export const teamStatusEnum = pgEnum("team_status", [
  "none",
  "product",
  "sop",
  "business",
  "forty",
]);

// ผังสายงาน: ผู้ใช้กรอกเอง เป็นข้อมูลส่วนตัวของผู้ใช้ (ไม่ผูกกับบัญชีผู้ใช้อื่น)
// parent_id = null หมายถึงอยู่ใต้ผู้ใช้โดยตรง (หัวสาย)
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => teamMembers.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    /** สถานะที่ผู้ใช้ประเมินเอง: ใช้สินค้า / มี SOP / ทำธุรกิจ / ทำ 40 คะแนนได้เอง */
    status: teamStatusEnum("status").notNull().default("business"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("team_members_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type WeeklyReview = typeof weeklyReviews.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Interest = (typeof interestEnum.enumValues)[number];
export type ActivityType = (typeof activityTypeEnum.enumValues)[number];
export type TeamMember = typeof teamMembers.$inferSelect;
export type TeamStatus = (typeof teamStatusEnum.enumValues)[number];

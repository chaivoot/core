import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { TeamStatus } from "@/lib/db/schema";
import { subtreeIds } from "@/lib/team";

// ทุกฟังก์ชันรับ userId และกรองด้วย userId เสมอ

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v);

export type TeamMemberInput = {
  name: string;
  parentId: string | null;
  status: TeamStatus;
  note: string | null;
};

export async function listTeamMembers(userId: string) {
  return db
    .select()
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.userId, userId))
    .orderBy(asc(schema.teamMembers.createdAt));
}

/** ตรวจว่า parent เป็นของผู้ใช้คนนี้ และ (ถ้าแก้ไข) ไม่ใช่ตัวเองหรือคนที่อยู่ใต้ตัวเอง */
async function isValidParent(userId: string, parentId: string | null, selfId?: string) {
  if (parentId === null) return true;
  if (!isUuid(parentId)) return false;
  const members = await listTeamMembers(userId);
  if (!members.some((m) => m.id === parentId)) return false;
  if (selfId && subtreeIds(members, selfId).has(parentId)) return false;
  return true;
}

export async function createTeamMember(userId: string, input: TeamMemberInput) {
  if (!(await isValidParent(userId, input.parentId))) return false;
  await db.insert(schema.teamMembers).values({ userId, ...input });
  return true;
}

export async function updateTeamMember(userId: string, id: string, input: TeamMemberInput) {
  if (!isUuid(id)) return false;
  if (!(await isValidParent(userId, input.parentId, id))) return false;
  const rows = await db
    .update(schema.teamMembers)
    .set({ ...input, updatedAt: sql`now()` })
    .where(and(eq(schema.teamMembers.id, id), eq(schema.teamMembers.userId, userId)))
    .returning({ id: schema.teamMembers.id });
  return rows.length > 0;
}

export async function setTeamStatus(userId: string, id: string, status: TeamStatus) {
  if (!isUuid(id)) return false;
  await db
    .update(schema.teamMembers)
    .set({ status, updatedAt: sql`now()` })
    .where(and(eq(schema.teamMembers.id, id), eq(schema.teamMembers.userId, userId)));
  return true;
}

/** ลบคนนี้ แล้วเลื่อนคนที่อยู่ใต้ขึ้นมาอยู่ใต้ upline ของคนที่ถูกลบ */
export async function deleteTeamMember(userId: string, id: string) {
  if (!isUuid(id)) return false;
  const [member] = await db
    .select({ parentId: schema.teamMembers.parentId })
    .from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.id, id), eq(schema.teamMembers.userId, userId)));
  if (!member) return false;
  await db
    .update(schema.teamMembers)
    .set({ parentId: member.parentId })
    .where(and(eq(schema.teamMembers.parentId, id), eq(schema.teamMembers.userId, userId)));
  await db
    .delete(schema.teamMembers)
    .where(and(eq(schema.teamMembers.id, id), eq(schema.teamMembers.userId, userId)));
  return true;
}

import "server-only";
import { and, asc, between, desc, eq, ilike, isNull, max, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { ActivityType, Interest } from "@/lib/db/schema";

// ทุกฟังก์ชันรับ userId และกรองด้วย userId เสมอ - รายชื่อเป็นข้อมูลบุคคลที่สาม ห้ามรั่วข้ามผู้ใช้

export type ContactInput = {
  name: string;
  channel: string | null;
  interest: Interest | null;
  note: string | null;
};

export type ContactSort = "added" | "recent" | "oldest";
export type InterestFilter = Interest | "none" | "all";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v);

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function listContacts(
  userId: string,
  opts: { q?: string; interest?: InterestFilter; sort?: ContactSort } = {},
) {
  const lastActivity = max(schema.activities.date);
  const conditions = [eq(schema.contacts.userId, userId)];
  const q = opts.q?.trim();
  if (q) conditions.push(ilike(schema.contacts.name, `%${escapeLike(q)}%`));
  if (opts.interest === "none") conditions.push(isNull(schema.contacts.interest));
  else if (opts.interest && opts.interest !== "all")
    conditions.push(eq(schema.contacts.interest, opts.interest));

  const order =
    opts.sort === "recent"
      ? [sql`${lastActivity} desc nulls last`, desc(schema.contacts.createdAt)]
      : opts.sort === "oldest"
        ? [sql`${lastActivity} asc nulls first`, asc(schema.contacts.createdAt)]
        : [desc(schema.contacts.createdAt)];

  return db
    .select({
      id: schema.contacts.id,
      name: schema.contacts.name,
      channel: schema.contacts.channel,
      interest: schema.contacts.interest,
      addedOn: schema.contacts.addedOn,
      lastActivity,
    })
    .from(schema.contacts)
    .leftJoin(
      schema.activities,
      and(
        eq(schema.activities.contactId, schema.contacts.id),
        eq(schema.activities.userId, userId),
      ),
    )
    .where(and(...conditions))
    .groupBy(schema.contacts.id)
    .orderBy(...order);
}

export async function getContact(userId: string, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select()
    .from(schema.contacts)
    .where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId)));
  return row ?? null;
}

export async function createContact(userId: string, addedOn: string, input: ContactInput) {
  const [row] = await db
    .insert(schema.contacts)
    .values({ userId, addedOn, ...input })
    .returning({ id: schema.contacts.id });
  return row;
}

export async function updateContact(userId: string, id: string, input: ContactInput) {
  if (!isUuid(id)) return false;
  const rows = await db
    .update(schema.contacts)
    .set({ ...input, updatedAt: sql`now()` })
    .where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId)))
    .returning({ id: schema.contacts.id });
  return rows.length > 0;
}

export async function deleteContact(userId: string, id: string) {
  if (!isUuid(id)) return false;
  const rows = await db
    .delete(schema.contacts)
    .where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId)))
    .returning({ id: schema.contacts.id });
  return rows.length > 0;
}

export async function countContactsAdded(userId: string, from: string, to: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.contacts)
    .where(and(eq(schema.contacts.userId, userId), between(schema.contacts.addedOn, from, to)));
  return row?.count ?? 0;
}

// ---------- กิจกรรม ----------

export type ActivityInput = { type: ActivityType; date: string; note: string | null };

export async function listActivities(userId: string, contactId: string) {
  return db
    .select()
    .from(schema.activities)
    .where(
      and(eq(schema.activities.userId, userId), eq(schema.activities.contactId, contactId)),
    )
    .orderBy(desc(schema.activities.date), desc(schema.activities.createdAt));
}

export async function getActivity(userId: string, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select()
    .from(schema.activities)
    .where(and(eq(schema.activities.id, id), eq(schema.activities.userId, userId)));
  return row ?? null;
}

export async function createActivity(userId: string, contactId: string, input: ActivityInput) {
  // ยืนยันว่ารายชื่อเป็นของผู้ใช้คนนี้ก่อนผูกกิจกรรม
  const contact = await getContact(userId, contactId);
  if (!contact) return false;
  await db.insert(schema.activities).values({ userId, contactId, ...input });
  return true;
}

export async function updateActivity(userId: string, id: string, input: ActivityInput) {
  if (!isUuid(id)) return false;
  const rows = await db
    .update(schema.activities)
    .set(input)
    .where(and(eq(schema.activities.id, id), eq(schema.activities.userId, userId)))
    .returning({ id: schema.activities.id });
  return rows.length > 0;
}

export async function deleteActivity(userId: string, id: string) {
  if (!isUuid(id)) return false;
  const rows = await db
    .delete(schema.activities)
    .where(and(eq(schema.activities.id, id), eq(schema.activities.userId, userId)))
    .returning({ id: schema.activities.id });
  return rows.length > 0;
}

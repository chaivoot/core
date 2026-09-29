import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// สิทธิ์ใช้ระบบ: ล็อกอิน LINE ได้ทุกคน แต่ใช้งานได้เมื่อได้รับเชิญ (หรือเป็นผู้ใช้เดิม)

const INVITE_DAYS = 7;

export async function hasAccess(userId: string) {
  const [u] = await db
    .select({ at: schema.users.accessGrantedAt })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return !!u?.at;
}

export async function grantAccess(userId: string) {
  await db
    .update(schema.users)
    .set({ accessGrantedAt: sql`now()` })
    .where(and(eq(schema.users.id, userId), isNull(schema.users.accessGrantedAt)));
}

export async function createAccessInvite(userId: string) {
  if (!(await hasAccess(userId))) return null;
  const token = randomBytes(18).toString("base64url");
  await db.insert(schema.accessInvites).values({
    token,
    inviterId: userId,
    expiresAt: sql`now() + make_interval(days => ${INVITE_DAYS})`,
  });
  return token;
}

export async function getOpenAccessInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  const [row] = await db
    .select({
      token: schema.accessInvites.token,
      inviterId: schema.accessInvites.inviterId,
      inviterName: schema.users.name,
    })
    .from(schema.accessInvites)
    .innerJoin(schema.users, eq(schema.users.id, schema.accessInvites.inviterId))
    .where(
      and(
        eq(schema.accessInvites.token, token),
        isNull(schema.accessInvites.usedAt),
        gt(schema.accessInvites.expiresAt, sql`now()`),
      ),
    );
  return row ?? null;
}

/** ใช้ลิงก์เชิญ: จองลิงก์ก่อน (กันใช้ซ้ำ) แล้วให้สิทธิ์ */
export async function redeemAccessInvite(token: string, userId: string) {
  if (await hasAccess(userId)) return "ok" as const; // มีสิทธิ์อยู่แล้ว ไม่ต้องเสียลิงก์
  const invite = await getOpenAccessInvite(token);
  if (!invite) return "invalid" as const;
  const claimed = await db
    .update(schema.accessInvites)
    .set({ usedAt: sql`now()`, usedBy: userId })
    .where(and(eq(schema.accessInvites.token, token), isNull(schema.accessInvites.usedAt)))
    .returning({ id: schema.accessInvites.id });
  if (claimed.length === 0) return "invalid" as const;
  await grantAccess(userId);
  return "ok" as const;
}

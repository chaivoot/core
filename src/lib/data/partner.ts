import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { grantAccess } from "@/lib/data/access";

// ผังสายงานร่วมกับคู่: คนเชิญเป็นเจ้าของผัง (owner) คนที่รับเชิญ (partner) ใช้ผังของ owner
// จับคู่ได้ทีละ 2 คนเท่านั้น และแชร์เฉพาะผังสายงาน

const INVITE_DAYS = 7;

export type TeamContext = {
  /** user id ที่เป็นเจ้าของผังที่ใช้อยู่ - ใช้กรอง team_members ทุก query */
  ownerId: string;
  role: "solo" | "owner" | "partner";
  /** อีกคนที่ใช้ผังร่วมกัน */
  other: { id: string; name: string | null } | null;
  /** ชื่อสำหรับวงกลมบนสุด (เจ้าของผังก่อน) */
  names: string[];
};

async function findUser(id: string) {
  const [u] = await db
    .select({ id: schema.users.id, name: schema.users.name, teamOwnerId: schema.users.teamOwnerId })
    .from(schema.users)
    .where(eq(schema.users.id, id));
  return u ?? null;
}

async function findPartnerOf(ownerId: string) {
  const [u] = await db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.teamOwnerId, ownerId))
    .limit(1);
  return u ?? null;
}

export async function getTeamContext(userId: string): Promise<TeamContext> {
  const me = await findUser(userId);
  if (me?.teamOwnerId) {
    const owner = await findUser(me.teamOwnerId);
    if (owner) {
      return {
        ownerId: owner.id,
        role: "partner",
        other: { id: owner.id, name: owner.name },
        names: [owner.name ?? "คู่", me.name ?? "คุณ"],
      };
    }
  }
  const partner = await findPartnerOf(userId);
  if (partner) {
    return {
      ownerId: userId,
      role: "owner",
      other: partner,
      names: [me?.name ?? "คุณ", partner.name ?? "คู่"],
    };
  }
  return { ownerId: userId, role: "solo", other: null, names: [me?.name ?? "คุณ"] };
}

export async function createInvite(userId: string) {
  const ctx = await getTeamContext(userId);
  if (ctx.role !== "solo") return null;
  const token = randomBytes(18).toString("base64url");
  await db.insert(schema.teamInvites).values({
    token,
    inviterId: userId,
    expiresAt: sql`now() + make_interval(days => ${INVITE_DAYS})`,
  });
  return token;
}

/** ลิงก์เชิญที่ยังใช้ได้ (ยังไม่ใช้ และไม่หมดอายุ) */
export async function getOpenInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  const [row] = await db
    .select({
      token: schema.teamInvites.token,
      inviterId: schema.teamInvites.inviterId,
      inviterName: schema.users.name,
      expiresAt: schema.teamInvites.expiresAt,
    })
    .from(schema.teamInvites)
    .innerJoin(schema.users, eq(schema.users.id, schema.teamInvites.inviterId))
    .where(
      and(
        eq(schema.teamInvites.token, token),
        isNull(schema.teamInvites.usedAt),
        gt(schema.teamInvites.expiresAt, sql`now()`),
      ),
    );
  return row ?? null;
}

export type AcceptResult = "ok" | "invalid" | "self" | "inviter_busy" | "you_busy";

export async function acceptInvite(token: string, userId: string): Promise<AcceptResult> {
  const invite = await getOpenInvite(token);
  if (!invite) return "invalid";
  if (invite.inviterId === userId) return "self";

  const [inviterCtx, myCtx] = await Promise.all([
    getTeamContext(invite.inviterId),
    getTeamContext(userId),
  ]);
  if (inviterCtx.role !== "solo") return "inviter_busy";
  if (myCtx.role !== "solo") return "you_busy";

  // จองลิงก์ก่อน กันการใช้ซ้ำ
  const claimed = await db
    .update(schema.teamInvites)
    .set({ usedAt: sql`now()`, usedBy: userId })
    .where(and(eq(schema.teamInvites.token, token), isNull(schema.teamInvites.usedAt)))
    .returning({ id: schema.teamInvites.id });
  if (claimed.length === 0) return "invalid";

  await db
    .update(schema.users)
    .set({ teamOwnerId: invite.inviterId })
    .where(and(eq(schema.users.id, userId), isNull(schema.users.teamOwnerId)));
  // คู่ที่รับเชิญผังร่วม ได้สิทธิ์ใช้ระบบไปด้วย
  await grantAccess(userId);
  return "ok";
}

/** เลิกใช้ผังร่วม: ทำได้ทั้งสองฝ่าย ผังของเจ้าของยังอยู่ ส่วนคู่กลับไปใช้ผังเดิมของตัวเอง */
export async function unlinkPartner(userId: string) {
  const ctx = await getTeamContext(userId);
  if (ctx.role === "partner") {
    await db.update(schema.users).set({ teamOwnerId: null }).where(eq(schema.users.id, userId));
  } else if (ctx.role === "owner") {
    await db
      .update(schema.users)
      .set({ teamOwnerId: null })
      .where(eq(schema.users.teamOwnerId, userId));
  }
}

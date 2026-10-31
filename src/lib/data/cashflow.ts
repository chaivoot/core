import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, count, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cashflowRooms } from "@/lib/db/schema";
import { newGame, type GameState } from "@/lib/cashflow/engine";

// ไม่มีตัวที่สับสนกันง่าย (0/O, 1/I)
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_TTL_HOURS = 24;

/** cookie ที่บอกว่าเครื่องนี้เป็น host ของห้อง */
export const hostCookie = (code: string) => `cf_host_${code}`;
export const HOST_COOKIE_MAX_AGE = ROOM_TTL_HOURS * 60 * 60;

export type Room = { code: string; hostTokenHash: string; state: GameState; version: number };

function newCode() {
  return Array.from({ length: 5 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
}

export function normalizeCode(code: string) {
  const c = code.toUpperCase();
  return /^[A-Z0-9]{5}$/.test(c) ? c : null;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** เครื่องนี้เป็น host ของห้องหรือไม่ (เทียบ token ใน cookie กับ hash ที่เก็บไว้) */
export function isHost(room: Room, token: string | undefined) {
  if (!token || !room.hostTokenHash) return false;
  const a = Buffer.from(sha256(token), "hex");
  const b = Buffer.from(room.hostTokenHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** กัน spam: จำกัดห้องที่สร้างได้ต่อชั่วโมง ต่อเครื่อง (IP) และรวมทั้งระบบ */
export const ROOMS_PER_IP_PER_HOUR = 5;
export const ROOMS_PER_HOUR = 200;

export class RoomLimitError extends Error {}

/** สร้างห้องใหม่ คืนรหัสห้องและ token ของ host (เก็บใน cookie) */
export async function createRoom(ip: string | null): Promise<{ code: string; hostToken: string }> {
  const ipHash = ip ? sha256(`cashflow:${ip}`) : null;
  const recent = gt(cashflowRooms.createdAt, sql`now() - interval '1 hour'`);
  const [all] = await db.select({ n: count() }).from(cashflowRooms).where(recent);
  if (all.n >= ROOMS_PER_HOUR) throw new RoomLimitError("ตอนนี้มีคนสร้างห้องเยอะมาก ลองใหม่อีกสักพัก");
  if (ipHash) {
    const [mine] = await db
      .select({ n: count() })
      .from(cashflowRooms)
      .where(and(recent, eq(cashflowRooms.creatorIpHash, ipHash)));
    if (mine.n >= ROOMS_PER_IP_PER_HOUR) {
      throw new RoomLimitError(`สร้างห้องได้ไม่เกิน ${ROOMS_PER_IP_PER_HOUR} ห้องต่อชั่วโมง ลองใหม่อีกสักพัก`);
    }
  }
  const hostToken = randomBytes(24).toString("base64url");
  // ลบห้องที่ไม่มีใครเล่นเกิน 24 ชั่วโมง
  await db
    .delete(cashflowRooms)
    .where(lt(cashflowRooms.updatedAt, sql`now() - make_interval(hours => ${ROOM_TTL_HOURS})`));

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const rows = await db
      .insert(cashflowRooms)
      .values({ code, hostTokenHash: sha256(hostToken), creatorIpHash: ipHash, state: newGame() })
      .onConflictDoNothing()
      .returning({ code: cashflowRooms.code });
    if (rows.length > 0) return { code, hostToken };
  }
  throw new Error("สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง");
}

export async function getRoom(code: string): Promise<Room | null> {
  const c = normalizeCode(code);
  if (!c) return null;
  const [row] = await db.select().from(cashflowRooms).where(eq(cashflowRooms.code, c)).limit(1);
  return row ? { code: row.code, hostTokenHash: row.hostTokenHash, state: row.state as GameState, version: row.version } : null;
}

/**
 * แก้สถานะห้องแบบกันเขียนทับ: ถ้ามีคนอื่นบันทึกก่อน (version เปลี่ยน) จะอ่านใหม่แล้วทำซ้ำ
 * fn คืน null = ไม่มีอะไรเปลี่ยน
 */
export async function updateRoom(
  code: string,
  fn: (room: Room) => GameState | null,
): Promise<Room | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const room = await getRoom(code);
    if (!room) return null;
    const next = fn(room);
    if (!next) return room;
    const rows = await db
      .update(cashflowRooms)
      .set({ state: next, version: room.version + 1, updatedAt: new Date() })
      .where(and(eq(cashflowRooms.code, room.code), eq(cashflowRooms.version, room.version)))
      .returning({ version: cashflowRooms.version });
    if (rows.length > 0) return { ...room, state: next, version: rows[0].version };
  }
  throw new Error("มีคนกดพร้อมกันเยอะ ลองใหม่อีกครั้ง");
}

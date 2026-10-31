import "server-only";
import { randomInt } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cashflowRooms } from "@/lib/db/schema";
import { newGame, type GameState } from "@/lib/cashflow/engine";

// ไม่มีตัวที่สับสนกันง่าย (0/O, 1/I)
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_TTL_HOURS = 24;

export type Room = { code: string; hostId: string; state: GameState; version: number };

function newCode() {
  return Array.from({ length: 5 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
}

export function normalizeCode(code: string) {
  const c = code.toUpperCase();
  return /^[A-Z0-9]{5}$/.test(c) ? c : null;
}

export async function createRoom(hostId: string): Promise<string> {
  // ลบห้องที่ไม่มีใครเล่นเกิน 24 ชั่วโมง
  await db
    .delete(cashflowRooms)
    .where(lt(cashflowRooms.updatedAt, sql`now() - make_interval(hours => ${ROOM_TTL_HOURS})`));

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const rows = await db
      .insert(cashflowRooms)
      .values({ code, hostId, state: newGame() })
      .onConflictDoNothing()
      .returning({ code: cashflowRooms.code });
    if (rows.length > 0) return code;
  }
  throw new Error("สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง");
}

export async function getRoom(code: string): Promise<Room | null> {
  const c = normalizeCode(code);
  if (!c) return null;
  const [row] = await db.select().from(cashflowRooms).where(eq(cashflowRooms.code, c)).limit(1);
  return row ? { code: row.code, hostId: row.hostId, state: row.state as GameState, version: row.version } : null;
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

import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { act, GameError, publicState, tick, type Action, type Actor } from "@/lib/cashflow/engine";
import { getRoom, updateRoom, type Room } from "@/lib/data/cashflow";
import { getCurrentUser } from "@/lib/session";

// มือถือผู้เล่นไม่ต้องล็อกอิน: จำตัวตนด้วย cookie ต่อห้อง
const cookieName = (code: string) => `cf_${code}`;

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join"), name: z.string().max(40), color: z.string().max(10) }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("skipTurn") }),
  z.object({ type: z.literal("roll"), dice: z.union([z.literal(1), z.literal(2)]).optional() }),
  z.object({ type: z.literal("charity"), give: z.boolean() }),
  z.object({ type: z.literal("deal"), size: z.enum(["small", "big"]) }),
  z.object({
    type: z.literal("respond"),
    buy: z.union([z.number().int().min(0).max(10_000_000), z.boolean()]).optional(),
    sell: z.number().int().min(0).max(100_000_000).optional(),
    sellAssets: z.array(z.string().max(20)).max(50).optional(),
  }),
  z.object({ type: z.literal("endTurn") }),
  z.object({ type: z.literal("chooseDream"), dream: z.number().int().min(0).max(20) }),
  z.object({ type: z.literal("setOptions"), resellDeals: z.boolean() }),
  z.object({ type: z.literal("loan"), count: z.number().int().min(1).max(1_000).optional() }),
  z.object({ type: z.literal("repay") }),
  z.object({ type: z.literal("payoff"), debt: z.enum(["house", "car", "card"]) }),
]);

const HOST_ACTIONS = new Set(["start", "skipTurn", "setOptions"]);

function view(room: Room, token: string | undefined) {
  const me = token ? (room.state.players.find((p) => p.token === token)?.id ?? null) : null;
  return { version: room.version, me, state: publicState(room.state) };
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request, ctx: RouteContext<"/cashflow/[code]/api">) {
  const { code } = await ctx.params;
  let room = await getRoom(code);
  if (!room) return json({ error: "ไม่พบห้องนี้" }, 404);

  // หมดเวลาตอบการ์ด → บันทึกว่า "ไม่ทำอะไร" (ทุกเครื่องดึงสถานะอยู่แล้ว จึงใช้จังหวะนี้)
  if (tick(room.state, Date.now())) {
    room = (await updateRoom(code, (r) => tick(r.state, Date.now()))) ?? room;
  }

  const since = Number(new URL(req.url).searchParams.get("v"));
  const token = (await cookies()).get(cookieName(room.code))?.value;
  const v = view(room, token);
  // ไม่มีอะไรเปลี่ยน ไม่ต้องส่งสถานะทั้งก้อน
  if (since === room.version) return json({ version: room.version, me: v.me, same: true });
  return json(v);
}

export async function POST(req: Request, ctx: RouteContext<"/cashflow/[code]/api">) {
  const { code } = await ctx.params;
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "คำสั่งไม่ถูกต้อง" }, 400);
  const input = parsed.data;

  const room0 = await getRoom(code);
  if (!room0) return json({ error: "ไม่พบห้องนี้" }, 404);

  const store = await cookies();
  const name = cookieName(room0.code);
  let token = store.get(name)?.value;

  const actor: Actor = {};
  if (HOST_ACTIONS.has(input.type)) {
    const user = await getCurrentUser();
    if (!user || user.id !== room0.hostId) return json({ error: "host เท่านั้นที่ทำได้" }, 403);
    actor.host = true;
  }

  let action: Action;
  if (input.type === "join") {
    if (token && room0.state.players.some((p) => p.token === token)) {
      return json({ error: "มือถือเครื่องนี้เข้าห้องแล้ว" }, 400);
    }
    token = randomBytes(18).toString("base64url");
    action = { ...input, token };
  } else {
    action = input;
  }

  try {
    const room = await updateRoom(room0.code, (r) => {
      const a: Actor = { ...actor, playerId: r.state.players.find((p) => token && p.token === token)?.id };
      return act(r.state, a, action, { now: Date.now(), rng: Math.random, id: () => randomUUID().slice(0, 8) });
    });
    if (!room) return json({ error: "ไม่พบห้องนี้" }, 404);
    if (input.type === "join") {
      store.set(name, token!, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: `/cashflow/${room.code}`,
        maxAge: 60 * 60 * 24,
      });
    }
    return json(view(room, token));
  } catch (e) {
    if (e instanceof GameError) return json({ error: e.message }, 400);
    throw e;
  }
}

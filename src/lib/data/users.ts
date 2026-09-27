import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export async function upsertLineUser(input: {
  lineUserId: string;
  name: string | null;
  image: string | null;
}) {
  const [user] = await db
    .insert(schema.users)
    .values(input)
    .onConflictDoUpdate({
      target: schema.users.lineUserId,
      set: { name: input.name, image: input.image },
    })
    .returning();
  return user;
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return user ?? null;
}

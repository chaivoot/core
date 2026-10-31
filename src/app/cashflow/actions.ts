"use server";

import { redirect } from "next/navigation";
import { createRoom } from "@/lib/data/cashflow";
import { requireUser } from "@/lib/session";

export async function createRoomAction() {
  const user = await requireUser();
  const code = await createRoom(user.id);
  redirect(`/cashflow/${code}/host`);
}

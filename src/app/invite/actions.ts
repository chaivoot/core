"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAccessInvite, redeemAccessInvite } from "@/lib/data/access";
import { requireSignedIn, requireUser } from "@/lib/session";

export async function createAccessInviteAction() {
  const user = await requireUser();
  const token = await createAccessInvite(user.id);
  redirect(token ? `/?invite=${token}#invite` : "/#invite");
}

export async function redeemAccessInviteAction(token: string) {
  const user = await requireSignedIn();
  const result = await redeemAccessInvite(token, user.id);
  revalidatePath("/", "layout");
  redirect(result === "ok" ? "/" : `/invite/${encodeURIComponent(token)}?e=invalid`);
}

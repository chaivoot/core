"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createTeamMember,
  deleteTeamMember,
  setTeamStatus,
  updateTeamMember,
} from "@/lib/data/team";
import { formObject, optionalText } from "@/lib/forms";
import { acceptInvite, createInvite, getTeamContext, unlinkPartner } from "@/lib/data/partner";
import { requireUser } from "@/lib/session";

/** ผังที่ผู้ใช้คนนี้ใช้อยู่ (ของตัวเอง หรือของคู่ถ้าใช้ผังร่วม) */
async function teamOwner() {
  const user = await requireUser();
  return (await getTeamContext(user.id)).ownerId;
}

const statusSchema = z.enum(["none", "product", "sop", "business", "forty"]);

const memberSchema = z.object({
  name: z.string().trim().min(1).max(200),
  parentId: z
    .string()
    .nullish()
    .transform((v) => (v ? v : null)),
  status: statusSchema,
  note: optionalText(2000),
});

export async function addTeamMemberAction(formData: FormData) {
  const ownerId = await teamOwner();
  const parsed = memberSchema.safeParse(formObject(formData));
  if (!parsed.success) redirect("/team?e=invalid");
  const ok = await createTeamMember(ownerId, parsed.data);
  revalidatePath("/team");
  redirect(ok ? "/team?ok=added" : "/team?e=invalid");
}

export async function updateTeamMemberAction(id: string, formData: FormData) {
  const ownerId = await teamOwner();
  const parsed = memberSchema.safeParse(formObject(formData));
  if (!parsed.success) redirect("/team?e=invalid");
  const ok = await updateTeamMember(ownerId, id, parsed.data);
  revalidatePath("/team");
  redirect(ok ? "/team?ok=saved" : "/team?e=parent");
}

export async function setStatusAction(id: string, formData: FormData) {
  const ownerId = await teamOwner();
  const status = statusSchema.safeParse(formData.get("status"));
  if (!status.success) return;
  await setTeamStatus(ownerId, id, status.data);
  revalidatePath("/team");
}

export async function deleteTeamMemberAction(id: string) {
  const ownerId = await teamOwner();
  await deleteTeamMember(ownerId, id);
  revalidatePath("/team");
  redirect("/team");
}

// ---------- ผังร่วมกับคู่ ----------

export async function createInviteAction() {
  const user = await requireUser();
  const token = await createInvite(user.id);
  redirect(token ? `/team?invite=${token}#partner` : "/team#partner");
}

export async function acceptInviteAction(token: string) {
  const user = await requireUser();
  const result = await acceptInvite(token, user.id);
  revalidatePath("/", "layout");
  redirect(result === "ok" ? "/team?ok=joined" : `/join/${encodeURIComponent(token)}?e=${result}`);
}

export async function unlinkPartnerAction() {
  const user = await requireUser();
  await unlinkPartner(user.id);
  revalidatePath("/", "layout");
  redirect("/team?ok=unlinked");
}

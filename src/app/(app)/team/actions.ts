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
import { requireUser } from "@/lib/session";

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
  const user = await requireUser();
  const parsed = memberSchema.safeParse(formObject(formData));
  if (!parsed.success) redirect("/team?e=invalid");
  const ok = await createTeamMember(user.id, parsed.data);
  revalidatePath("/team");
  redirect(ok ? "/team?ok=added" : "/team?e=invalid");
}

export async function updateTeamMemberAction(id: string, formData: FormData) {
  const user = await requireUser();
  const parsed = memberSchema.safeParse(formObject(formData));
  if (!parsed.success) redirect("/team?e=invalid");
  const ok = await updateTeamMember(user.id, id, parsed.data);
  revalidatePath("/team");
  redirect(ok ? "/team?ok=saved" : "/team?e=parent");
}

export async function setStatusAction(id: string, formData: FormData) {
  const user = await requireUser();
  const status = statusSchema.safeParse(formData.get("status"));
  if (!status.success) return;
  await setTeamStatus(user.id, id, status.data);
  revalidatePath("/team");
}

export async function deleteTeamMemberAction(id: string) {
  const user = await requireUser();
  await deleteTeamMember(user.id, id);
  revalidatePath("/team");
  redirect("/team");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createActivity,
  createContact,
  deleteActivity,
  deleteContact,
  getActivity,
  updateActivity,
  updateContact,
} from "@/lib/data/contacts";
import { canEditActivityDate, isValidDate, today } from "@/lib/dates";
import { formObject, optionalText } from "@/lib/forms";
import { requireUser } from "@/lib/session";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  channel: optionalText(300),
  interest: z
    .enum(["product", "business", ""])
    .nullish()
    .transform((v) => (v ? v : null)),
  note: optionalText(5000),
});

const activitySchema = z.object({
  type: z.enum(["appointment", "product_intro", "business_plan", "follow_up"]),
  date: z.string().refine(isValidDate),
  note: optionalText(5000),
});

function refresh(contactId?: string) {
  revalidatePath("/", "layout");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

export async function addContactAction(formData: FormData) {
  const user = await requireUser();
  const parsed = contactSchema.safeParse(formObject(formData));
  if (!parsed.success) return;
  const created = await createContact(user.id, today(), parsed.data);
  refresh();
  if (formData.get("open") === "1") redirect(`/contacts/${created.id}`);
}

export async function updateContactAction(id: string, formData: FormData) {
  const user = await requireUser();
  const parsed = contactSchema.safeParse(formObject(formData));
  if (!parsed.success) redirect(`/contacts/${id}?e=invalid`);
  await updateContact(user.id, id, parsed.data);
  refresh(id);
  redirect(`/contacts/${id}?ok=saved`);
}

export async function deleteContactAction(id: string) {
  const user = await requireUser();
  await deleteContact(user.id, id);
  refresh();
  redirect("/contacts");
}

export async function addActivityAction(contactId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = activitySchema.safeParse(formObject(formData));
  if (!parsed.success) redirect(`/contacts/${contactId}?e=invalid`);
  if (!canEditActivityDate(parsed.data.date)) redirect(`/contacts/${contactId}?e=too_old`);
  await createActivity(user.id, contactId, parsed.data);
  refresh(contactId);
  redirect(`/contacts/${contactId}?ok=activity`);
}

export async function updateActivityAction(id: string, formData: FormData) {
  const user = await requireUser();
  const existing = await getActivity(user.id, id);
  if (!existing) redirect("/contacts");
  const back = `/contacts/${existing.contactId}`;
  const parsed = activitySchema.safeParse(formObject(formData));
  if (!parsed.success) redirect(`${back}?e=invalid`);
  if (!canEditActivityDate(existing.date) || !canEditActivityDate(parsed.data.date))
    redirect(`${back}?e=too_old`);
  await updateActivity(user.id, id, parsed.data);
  refresh(existing.contactId);
  redirect(`${back}?ok=saved`);
}

export async function deleteActivityAction(id: string) {
  const user = await requireUser();
  const existing = await getActivity(user.id, id);
  if (!existing) redirect("/contacts");
  const back = `/contacts/${existing.contactId}`;
  if (!canEditActivityDate(existing.date)) redirect(`${back}?e=too_old`);
  await deleteActivity(user.id, id);
  refresh(existing.contactId);
  redirect(back);
}

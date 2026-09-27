"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { saveReview, type ReviewPatch } from "@/lib/data/reviews";
import { canEditWeek, isWeekStart } from "@/lib/dates";
import { checkbox, formObject, optionalText } from "@/lib/forms";
import { requireUser } from "@/lib/session";

const scoreField = z.coerce.number().int().min(0).max(10);
const detail = optionalText(1000);

const stepSchemas = {
  1: z
    .object({
      rank: z
        .enum(["1", "2", "3", ""])
        .nullish()
        .transform((v) => (v ? Number(v) : null)),
      score: scoreField,
    })
    .transform(({ rank, score }): ReviewPatch => ({ priorityRank: rank, priorityScore: score })),
  2: z
    .object({ productsUsed: checkbox, score: scoreField })
    .transform(({ productsUsed, score }): ReviewPatch => ({ productsUsed, productsScore: score })),
  3: z
    .object({
      learnListen: checkbox,
      learnListenDetail: detail,
      learnRead: checkbox,
      learnReadDetail: detail,
      learnMeeting: checkbox,
      learnMeetingDetail: detail,
      learnAcademy: checkbox,
      learnAcademyDetail: detail,
      score: scoreField,
    })
    .transform(({ score, ...rest }): ReviewPatch => ({ ...rest, learningScore: score })),
  4: z
    .object({ teamWork: checkbox, teamWorkDetail: detail, score: scoreField })
    .transform(({ score, ...rest }): ReviewPatch => ({ ...rest, actionScore: score })),
} as const;

export async function saveStepAction(week: string, step: number, formData: FormData) {
  const user = await requireUser();
  if (!isWeekStart(week) || !(step in stepSchemas)) redirect("/");
  if (!canEditWeek(week)) redirect(`/review/${week}/summary`);

  const schema = stepSchemas[step as keyof typeof stepSchemas];
  const parsed = schema.safeParse(formObject(formData));
  if (!parsed.success) redirect(`/review/${week}/${step}?e=invalid`);

  await saveReview(user.id, week, parsed.data);
  revalidatePath("/", "layout");
  redirect(step < 4 ? `/review/${week}/${step + 1}` : `/review/${week}/summary`);
}

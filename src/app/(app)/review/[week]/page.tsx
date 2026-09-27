import { redirect } from "next/navigation";

export default async function ReviewWeekPage({ params }: PageProps<"/review/[week]">) {
  const { week } = await params;
  redirect(`/review/${week}/1`);
}

import { redirect } from "next/navigation";
import { monthOfDate, today } from "@/lib/dates";

export default function SummaryIndexPage() {
  redirect(`/summary/${monthOfDate(today())}`);
}

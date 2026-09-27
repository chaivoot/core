import type { Interest } from "@/lib/db/schema";
import { INTEREST_LABELS } from "@/lib/labels";

export function InterestBadge({ interest }: { interest: Interest | null }) {
  if (!interest) return null;
  const cls =
    interest === "business" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {INTEREST_LABELS[interest]}
    </span>
  );
}

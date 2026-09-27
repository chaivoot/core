import { BottomNav } from "@/components/bottom-nav";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <>
      <main className="mx-auto w-full max-w-xl px-4 pt-5 pb-24">{children}</main>
      <BottomNav />
    </>
  );
}

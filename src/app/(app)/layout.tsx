import { BottomNav } from "@/components/bottom-nav";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <>
      <main className="mx-auto w-full max-w-xl px-4 pt-5 pb-24 print:max-w-none print:p-0">{children}</main>
      <BottomNav />
    </>
  );
}

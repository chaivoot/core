"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "หน้าหลัก", match: (p: string) => p === "/" || p.startsWith("/review") },
  { href: "/contacts", label: "รายชื่อ", match: (p: string) => p.startsWith("/contacts") },
  { href: "/team", label: "สายงาน", match: (p: string) => p.startsWith("/team") },
  { href: "/summary", label: "สรุปเดือน", match: (p: string) => p.startsWith("/summary") },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-xl">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex h-14 items-center justify-center text-sm font-medium ${
                  active ? "text-teal-700" : "text-stone-500"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className={active ? "border-b-2 border-teal-700 pb-0.5" : "pb-0.5"}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

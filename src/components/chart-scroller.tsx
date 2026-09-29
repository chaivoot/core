"use client";

import { useEffect, useRef } from "react";

/** กล่องเลื่อนซ้ายขวาของชาร์ต: ตอนเปิดหน้า เลื่อนให้จุด centerX (วงบนสุด) อยู่กลางจอ */
export function ChartScroller({
  centerX,
  children,
}: {
  centerX: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = centerX - el.clientWidth / 2;
  }, [centerX]);
  return (
    <div ref={ref} className="-mx-4 overflow-x-auto px-4">
      {children}
    </div>
  );
}

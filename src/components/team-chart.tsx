import type { ChartLink, ChartNode } from "@/lib/team";

const SLOT = 80; // ความกว้างต่อคน (4 สายพอดีจอมือถือ)
const LEVEL = 120; // ระยะห่างแต่ละชั้น
const R = 25; // รัศมีวงกลม
const LABEL = 26; // พื้นที่ชื่อใต้วงกลม (เส้นเชื่อมเริ่มใต้ชื่อ จะได้ไม่ทับ)
const PAD_TOP = 8;
const MAX_NAME = 8; // ความยาวชื่อที่แสดงใต้วงกลม (ตัวอักษร)

const segmenter = new Intl.Segmenter("th", { granularity: "grapheme" });

function shortName(name: string) {
  const chars = Array.from(segmenter.segment(name), (s) => s.segment);
  return chars.length > MAX_NAME ? `${chars.slice(0, MAX_NAME - 1).join("")}…` : name;
}

const cx = (n: ChartNode) => n.x * SLOT + SLOT / 2;
const cy = (n: ChartNode) => PAD_TOP + n.level * LEVEL + R;

/** ชาร์ตผังสายงาน: วงกลม + เส้นเชื่อมแบบมุมฉาก กดที่วงกลมเพื่อไปยังรายละเอียด */
export function TeamChart({
  nodes,
  links,
  slots,
  levels,
}: {
  nodes: ChartNode[];
  links: ChartLink[];
  slots: number;
  levels: number;
}) {
  const width = slots * SLOT;
  const height = PAD_TOP + (levels - 1) * LEVEL + R * 2 + LABEL + 4;

  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block"
        role="img"
        aria-label="ผังสายงาน"
      >
        <g className="stroke-slate-700" strokeWidth={2} fill="none">
          {links.map((l) => {
            const px = cx(l.parent);
            const py = cy(l.parent);
            const startY = py + R + LABEL;
            const midY = startY + (LEVEL - 2 * R - LABEL) / 2;
            const xs = l.children.map(cx);
            return (
              <g key={`${l.parent.id ?? "me"}`}>
                <line x1={px} y1={startY} x2={px} y2={midY} />
                <line x1={Math.min(px, ...xs)} y1={midY} x2={Math.max(px, ...xs)} y2={midY} />
                {l.children.map((c) => (
                  <line key={c.id} x1={cx(c)} y1={midY} x2={cx(c)} y2={cy(c) - R} />
                ))}
              </g>
            );
          })}
        </g>

        {nodes.map((n) => {
          const x = cx(n);
          const y = cy(n);
          const isMe = n.id === null;
          const circle = (
            <>
              <circle
                cx={x}
                cy={y}
                r={R}
                strokeWidth={2.5}
                className={
                  isMe
                    ? "fill-teal-50 stroke-teal-700"
                    : n.selfForty
                      ? "fill-teal-600 stroke-teal-700"
                      : "fill-white stroke-slate-700"
                }
              />
              {(isMe || n.selfForty) && (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={isMe ? "fill-teal-800 text-xs font-semibold" : "fill-white text-sm font-bold"}
                >
                  {isMe ? "คุณ" : "40"}
                </text>
              )}
              <text
                x={x}
                y={y + R + 18}
                textAnchor="middle"
                className="fill-stone-800 text-[13px] font-medium"
              >
                {shortName(n.name)}
              </text>
              <title>
                {n.name}
                {n.selfForty ? " · ทำ 40 คะแนนได้เอง" : ""}
              </title>
            </>
          );
          return isMe ? (
            <g key="me">{circle}</g>
          ) : (
            <a key={n.id} href={`#m-${n.id}`} className="cursor-pointer">
              {circle}
            </a>
          );
        })}
      </svg>
    </div>
  );
}

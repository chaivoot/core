import { TEAM_STATUSES } from "@/lib/labels";
import type { ChartLink, ChartNode, TeamStatus } from "@/lib/team";

// สีตามสถานะ: เขียว / ฟ้า / แดง / ม่วง ใช้ร่วมกับตัวหนังสือในวงกลม ไม่พึ่งสีอย่างเดียว
export const STATUS_STYLE: Record<TeamStatus, { circle: string; text: string; dot: string }> = {
  product: { circle: "fill-green-100 stroke-green-600", text: "fill-green-800", dot: "border-2 border-green-600 bg-green-100" },
  sop: { circle: "fill-sky-100 stroke-sky-600", text: "fill-sky-800", dot: "border-2 border-sky-600 bg-sky-100" },
  business: { circle: "fill-red-100 stroke-red-600", text: "fill-red-800", dot: "border-2 border-red-600 bg-red-100" },
  forty: { circle: "fill-purple-600 stroke-purple-700", text: "fill-white", dot: "border-2 border-purple-700 bg-purple-600" },
};

const SHORT = Object.fromEntries(TEAM_STATUSES.map((s) => [s.value, s.short])) as Record<TeamStatus, string>;

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
                  n.status === null ? "fill-stone-50 stroke-slate-700" : STATUS_STYLE[n.status].circle
                }
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className={
                  n.status === null
                    ? "fill-slate-800 text-xs font-semibold"
                    : `${STATUS_STYLE[n.status].text} ${n.status === "forty" ? "text-sm font-bold" : "text-[11px] font-semibold"}`
                }
              >
                {n.status === null ? "คุณ" : SHORT[n.status]}
              </text>
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
                {n.status ? ` · ${TEAM_STATUSES.find((s) => s.value === n.status)?.label}` : ""}
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

export function StatusDot({ status }: { status: TeamStatus }) {
  return <span className={`inline-block h-3 w-3 shrink-0 rounded-full ${STATUS_STYLE[status].dot}`} />;
}

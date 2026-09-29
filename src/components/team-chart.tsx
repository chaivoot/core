import { TEAM_STATUSES } from "@/lib/labels";
import type { ChartLink, ChartNode, TeamStatus } from "@/lib/team";

// สีตามสถานะ: เขียวอ่อน / เขียวเข้ม / ฟ้าอ่อน / น้ำเงินเข้ม ใช้ร่วมกับตัวหนังสือในวงกลม ไม่พึ่งสีอย่างเดียว
export const STATUS_STYLE: Record<TeamStatus, { circle: string; text: string; dot: string }> = {
  none: { circle: "fill-white stroke-stone-400", text: "fill-stone-400", dot: "border-2 border-stone-400 bg-white" },
  product: { circle: "fill-green-100 stroke-green-500", text: "fill-green-800", dot: "border-2 border-green-500 bg-green-100" },
  sop: { circle: "fill-green-700 stroke-green-800", text: "fill-white", dot: "border-2 border-green-800 bg-green-700" },
  business: { circle: "fill-sky-100 stroke-sky-500", text: "fill-sky-800", dot: "border-2 border-sky-500 bg-sky-100" },
  forty: { circle: "fill-blue-900 stroke-blue-950", text: "fill-white", dot: "border-2 border-blue-950 bg-blue-900" },
};

const SHORT = Object.fromEntries(TEAM_STATUSES.map((s) => [s.value, s.short])) as Record<TeamStatus, string>;

const SLOT = 80; // ความกว้างต่อคน (4 สายพอดีจอมือถือ)
const LEVEL = 120; // ระยะห่างแต่ละชั้น
const R = 25; // รัศมีวงกลม
const LABEL = 26; // พื้นที่ชื่อใต้วงกลม (เส้นเชื่อมเริ่มใต้ชื่อ จะได้ไม่ทับ)
const PAD_TOP = 8;
const MAX_NAME = 8; // ความยาวชื่อที่แสดงใต้วงกลม (ตัวอักษร)

const segmenter = new Intl.Segmenter("th", { granularity: "grapheme" });

function shortName(name: string, max = MAX_NAME) {
  const chars = Array.from(segmenter.segment(name), (s) => s.segment);
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : name;
}

const cx = (n: ChartNode) => n.x * SLOT + SLOT / 2;
const cy = (n: ChartNode) => PAD_TOP + n.level * LEVEL + R;

/** ชาร์ตผังสายงาน: วงกลม + เส้นเชื่อมแบบมุมฉาก กดที่วงกลมเพื่อไปยังรายละเอียด */
export function TeamChart({
  nodes,
  links,
  slots,
  levels,
  fit = false,
}: {
  nodes: ChartNode[];
  links: ChartLink[];
  slots: number;
  levels: number;
  /** ย่อให้พอดีความกว้าง (ใช้ตอนพิมพ์) แทนการเลื่อนซ้ายขวา */
  fit?: boolean;
}) {
  const width = slots * SLOT;
  const height = PAD_TOP + (levels - 1) * LEVEL + R * 2 + LABEL + 4;

  return (
    <div className={fit ? "" : "-mx-4 overflow-x-auto px-4"}>
      <svg
        width={fit ? "100%" : width}
        height={fit ? undefined : height}
        style={fit ? { maxWidth: width, maxHeight: "9in" } : undefined}
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
                {shortName(n.name, isMe ? 24 : MAX_NAME)}
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

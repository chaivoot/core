"use client";

import { useEffect, useMemo, useState } from "react";
import { plan, readiness, SURVIVAL, TEMPLATES, type CostItem, type PlanInput, type ReadinessKey, type Template } from "@/lib/sme/plan";

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const money = (n: number) => (Number.isFinite(n) ? `฿${thb.format(Math.round(n))}` : "—");
const short = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("th-TH", { maximumFractionDigits: 1 })} ล้าน` : `${Math.round(n / 1000).toLocaleString("th-TH")}k`;
const years = (y: number) => (Number.isInteger(y) ? `${y}` : y.toLocaleString("th-TH", { maximumFractionDigits: 1 }));

type State = PlanInput & { templateId: string; checks: Partial<Record<ReadinessKey, boolean>> };

const STORAGE_KEY = "sme-plan-v1";

function fromTemplate(t: Template, prev?: Partial<State>): State {
  return {
    templateId: t.id,
    setup: t.setup.map((x) => ({ ...x })),
    monthly: t.monthly.map((x) => ({ ...x })),
    margin: t.margin,
    ownSpace: prev?.ownSpace ?? false,
    ownerPay: prev?.ownerPay ?? 15_000,
    runwayMonths: prev?.runwayMonths ?? 9,
    family: prev?.family ?? 0,
    loan: prev?.loan ?? 0,
    savingsNow: prev?.savingsNow ?? 50_000,
    savePerMonth: prev?.savePerMonth ?? 5_000,
    saveGrowth: prev?.saveGrowth ?? 3,
    // ไม่คิดผลตอบแทนเงินเก็บและเงินเฟ้อ (ให้ตัวเลขเข้าใจง่าย ใช้ราคาวันนี้)
    returnRate: 0,
    inflation: 0,
    targetYears: prev?.targetYears ?? 10,
    checks: prev?.checks ?? {},
  };
}

/** ช่องตัวเลขเงินบาท (พิมพ์ได้ มีคอมมา) */
function MoneyInput({ value, onChange, label, suffix }: { value: number; onChange: (n: number) => void; label?: string; suffix?: string }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <span className="relative block">
        <input
          className="input pr-12 text-right tabular-nums"
          inputMode="numeric"
          value={value ? thb.format(value) : ""}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-stone-400">{suffix ?? "บาท"}</span>
      </span>
    </label>
  );
}

function NumberField({ value, onChange, label, suffix, min = 0, max = 100, step = 1 }: { value: number; onChange: (n: number) => void; label: string; suffix: string; min?: number; max?: number; step?: number }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <input
          className="input pr-14 text-right tabular-nums"
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-stone-400">{suffix}</span>
      </span>
    </label>
  );
}

/** รายการค่าใช้จ่ายแก้ไขได้ (ชื่อ + จำนวนเงิน เพิ่ม/ลบได้) */
function CostList({ items, onChange, ownSpace }: { items: CostItem[]; onChange: (xs: CostItem[]) => void; ownSpace: boolean }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const off = ownSpace && (it.tag === "rent" || it.tag === "deposit");
        return (
          <div key={i} className={`flex items-center gap-2 ${off ? "opacity-40" : ""}`}>
            <input
              className="input min-w-0 flex-1"
              value={it.label}
              aria-label="รายการ"
              onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            />
            <div className="w-36 shrink-0">
              <MoneyInput value={it.amount} onChange={(n) => onChange(items.map((x, j) => (j === i ? { ...x, amount: n } : x)))} />
            </div>
            <button className="btn-ghost min-h-11 shrink-0 px-2 text-stone-400" aria-label="ลบรายการ" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        );
      })}
      {ownSpace && items.some((x) => x.tag) && <p className="text-xs text-stone-500">รายการจาง = ไม่นับ เพราะมีที่/ตึกของตัวเองแล้ว</p>}
      <button className="btn-ghost min-h-9 px-2 text-sm text-teal-700" onClick={() => onChange([...items, { label: "รายการใหม่", amount: 0 }])}>
        + เพิ่มรายการ
      </button>
    </div>
  );
}

/** แยกชื่อร้านเป็นชื่อหลักกับคำขยาย เช่น "ร้านกาแฟ (สร้างแบรนด์เอง)" */
function splitName(name: string) {
  const paren = name.match(/^(.*?)\s*\((.*)\)$/);
  if (paren) return { main: paren[1], sub: paren[2] };
  const [main, ...rest] = name.split(" / ");
  return { main, sub: rest.join(" / ") };
}

/** กล่องแผงข้อมูลแบบ dashboard */
function Panel({ title, step, children, desc, right }: { title: string; step?: number; desc?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            {step !== undefined && (
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">{step}</span>
            )}
            {title}
          </h2>
          {desc && <p className="mt-0.5 text-sm text-slate-500">{desc}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

type Tone = "good" | "warn" | "bad" | "neutral";
const TONE: Record<Tone, { text: string; bar: string; chip: string }> = {
  good: { text: "text-emerald-700", bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  warn: { text: "text-amber-700", bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-amber-200" },
  bad: { text: "text-rose-700", bar: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-rose-200" },
  neutral: { text: "text-slate-900", bar: "bg-slate-400", chip: "bg-slate-50 text-slate-600 ring-slate-200" },
};

/** การ์ดตัวเลขหลัก (KPI) */
function Kpi({ label, value, sub, tone = "neutral", pct }: { label: string; value: string; sub?: React.ReactNode; tone?: Tone; pct?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums sm:text-3xl ${TONE[tone].text}`}>{value}</p>
      {pct !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full transition-all duration-500 ${TONE[tone].bar}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
        </div>
      )}
      {sub && <div className="mt-1.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

/** แถบสัดส่วนเงินที่ต้องใช้ แยกตามแหล่ง/ประเภท */
function Breakdown({ parts, total }: { parts: { label: string; value: number; color: string }[]; total: number }) {
  const shown = parts.filter((p) => p.value > 0);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        {shown.map((p) => (
          <div key={p.label} className={p.color} style={{ width: `${(p.value / Math.max(1, total)) * 100}%` }} title={p.label} />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {shown.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span className={`size-2.5 rounded-sm ${p.color}`} />
              {p.label}
            </span>
            <span className="tabular-nums text-slate-900">
              {money(p.value)} <span className="text-xs text-slate-400">({Math.round((p.value / Math.max(1, total)) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** กราฟแท่งโอกาสรอดของธุรกิจใหม่ */
function SurvivalChart() {
  return (
    <div className="flex h-40 items-end gap-3">
      {SURVIVAL.map((x) => (
        <div key={x.year} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-semibold tabular-nums text-slate-700">{x.pct}%</span>
          <div className="flex h-28 w-full items-end overflow-hidden rounded-md bg-rose-50">
            <div className="w-full rounded-md bg-gradient-to-t from-teal-600 to-teal-400" style={{ height: `${x.pct}%` }} />
          </div>
          <span className="text-xs text-slate-500">ปีที่ {x.year}</span>
        </div>
      ))}
    </div>
  );
}

function Slider({ value, min, max, onChange, label, unit }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string; unit: string }) {
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-teal-700" aria-label={label} />
      <span className="w-24 shrink-0 text-right text-lg font-bold tabular-nums">
        {value} {unit}
      </span>
    </div>
  );
}

/** กราฟเส้น: เงินเก็บสะสม vs เงินที่ต้องมี ในแต่ละปี */
function Chart({ series, target, ready }: { series: { year: number; saved: number; need: number }[]; target: number; ready: number | null }) {
  const W = 640;
  const H = 240;
  const pad = { l: 56, r: 12, t: 12, b: 28 };
  const maxY = Math.max(1, ...series.map((s) => Math.max(s.saved, s.need))) * 1.08;
  const maxX = series[series.length - 1].year || 1;
  const x = (y: number) => pad.l + (y / maxX) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / maxY) * (H - pad.t - pad.b);
  const path = (k: "saved" | "need") => series.map((s, i) => `${i ? "L" : "M"}${x(s.year).toFixed(1)},${y(s[k]).toFixed(1)}`).join("");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="กราฟเงินเก็บเทียบกับเงินที่ต้องมี">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {short(t)}
            </text>
          </g>
        ))}
        {series
          .filter((s) => s.year % (maxX > 20 ? 5 : 2) === 0)
          .map((s) => (
            <text key={s.year} x={x(s.year)} y={H - 8} textAnchor="middle" fontSize="11" fill="#64748b">
              {s.year === 0 ? "วันนี้" : `ปี ${s.year}`}
            </text>
          ))}
        <line x1={x(target)} x2={x(target)} y1={pad.t} y2={H - pad.b} stroke="#0f766e" strokeDasharray="4 4" />
        <text x={x(target) + 4} y={pad.t + 12} fontSize="11" fill="#0f766e">
          เป้าหมาย
        </text>
        <path d={path("need")} fill="none" stroke="#e11d48" strokeWidth="2" strokeDasharray="6 4" />
        <path d={`${path("saved")}L${x(maxX)},${y(0)}L${x(0)},${y(0)}Z`} fill="#0d9488" opacity="0.08" />
        <path d={path("saved")} fill="none" stroke="#0d9488" strokeWidth="2.5" />
        {ready !== null && ready <= maxX && <circle cx={x(ready)} cy={y(series[Math.min(series.length - 1, Math.round(ready))].saved)} r="5" fill="#0d9488" />}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 bg-teal-600" /> เงินเก็บสะสม
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-rose-600" /> เงินที่ต้องเก็บเอง
        </span>
      </figcaption>
    </figure>
  );
}

export function SmeSimulator() {
  const [s, setS] = useState<State>(() => fromTemplate(TEMPLATES[0]));
  const [loaded, setLoaded] = useState(false);

  // จำแผนที่กรอกไว้ในเบราว์เซอร์เครื่องนี้ (กลับมาแก้ต่อได้)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่านค่าที่บันทึกไว้ครั้งเดียวตอนเปิดหน้า
      if (raw) setS({ ...fromTemplate(TEMPLATES[0]), ...JSON.parse(raw), returnRate: 0, inflation: 0 });
    } catch {
      // ไม่มีที่เก็บ ก็เริ่มใหม่
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // เก็บไม่ได้ก็ไม่เป็นไร
    }
  }, [s, loaded]);

  const set = <K extends keyof State>(k: K, v: State[K]) => setS((x) => ({ ...x, [k]: v }));
  const r = useMemo(() => plan(s), [s]);
  const factors = readiness(r, s, s.checks);
  const okCount = factors.filter((f) => f.ok).length;
  const template = TEMPLATES.find((t) => t.id === s.templateId);
  const late = r.yearsToReady === null ? null : r.yearsToReady - s.targetYears;
  /** กำลังเลือกธุรกิจอยู่ (แสดงทุกตัวเลือก) · เลือกแล้วเหลือแค่ใบที่เลือก แตะซ้ำเพื่อเปลี่ยน */
  const [picking, setPicking] = useState(true);

  const readyTone: Tone = r.readyPct >= 100 ? "good" : r.readyPct >= 70 ? "warn" : "bad";
  const timeTone: Tone = late === null ? "bad" : late <= 0 ? "good" : late <= 3 ? "warn" : "bad";
  const runwayTone: Tone = s.runwayMonths >= 12 ? "good" : s.runwayMonths >= 6 ? "warn" : "bad";
  const yearsText = r.yearsToReady === null ? "40+ ปี" : `${years(Math.ceil(r.yearsToReady * 2) / 2)} ปี`;

  const results = (
    <div className="space-y-4">
      {/* KPI หลัก */}
      {/* ตัวเลขหลัก: เงินที่ต้องมี */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-800 to-slate-900 p-5 text-white shadow-md">
        <p className="text-sm font-medium tracking-wide text-teal-100 uppercase">ต้องมีเงินทั้งหมด (ราคาวันนี้)</p>
        <p className="mt-1 text-4xl font-bold tabular-nums sm:text-5xl">{money(r.needToday)}</p>
        <div className="mt-4 grid gap-3 border-t border-white/15 pt-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-teal-100/80">เงินลงทุน + เงินหมุนเวียน</p>
            <p className="font-semibold tabular-nums">
              {money(r.setupTotal)} + {money(r.runwayTotal)}
            </p>
          </div>
          <div>
            <p className="text-teal-100/80">ต้องเก็บเอง</p>
            <p className="text-lg font-bold tabular-nums">{money(r.ownNeedToday)}</p>
          </div>
          {s.inflation > 0 && (
            <div>
              <p className="text-teal-100/80">ถึงปีที่ {s.targetYears} ต้องเก็บเอง</p>
              <p className="text-lg font-bold tabular-nums text-amber-300">{money(r.needAtTarget)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label={`พร้อมในปีที่ ${s.targetYears}`} value={`${Math.floor(r.readyPct)}%`} tone={readyTone} pct={r.readyPct} sub={`มี ${money(r.savedAtTarget)}`} />
        <Kpi
          label="เก็บเงินครบใน"
          value={yearsText}
          tone={timeTone}
          sub={late === null ? "ยังไม่พอภายใน 40 ปี" : late <= 0 ? "✓ ทันตามเป้า" : `ช้ากว่าเป้า ${years(Math.ceil(late * 2) / 2)} ปี`}
        />
        <div className="col-span-2 sm:col-span-1">
          <Kpi label="ยอดขายคุ้มทุน/วัน" value={money(r.breakEvenSales / 26)} sub={`${money(r.breakEvenSales)}/เดือน (เปิด 26 วัน)`} />
        </div>
      </div>

      {r.readyPct < 100 && (
        <div className={`rounded-xl px-4 py-3 text-sm ring-1 ${TONE.warn.chip}`}>
          ต้องเก็บเดือนละ <b className="tabular-nums">{money(r.savePerMonthNeeded)}</b> ถึงจะทันเริ่มในปีที่ {s.targetYears} (ตอนนี้เก็บ {money(s.savePerMonth)})
        </div>
      )}

      <Panel title="เงินเก็บสะสม vs เงินที่ต้องมี" desc="เส้นประ = เงินที่ต้องเก็บเอง">
        <Chart series={r.series} target={s.targetYears} ready={r.yearsToReady} />
      </Panel>

      <Panel title="เงินที่ต้องใช้ มาจากไหน ไปไหน">
        <p className="mb-2 text-xs font-medium text-slate-500 uppercase">ใช้ไปกับ</p>
        <Breakdown
          total={r.needToday}
          parts={[
            { label: "เงินลงทุนเริ่มต้น", value: r.setupTotal, color: "bg-indigo-500" },
            { label: `เงินหมุนเวียน ${s.runwayMonths} เดือน`, value: r.runwayTotal, color: "bg-sky-400" },
          ]}
        />
        <p className="mt-4 mb-2 text-xs font-medium text-slate-500 uppercase">มาจาก</p>
        <Breakdown
          total={r.needToday}
          parts={[
            { label: "เงินเก็บของตัวเอง", value: r.ownNeedToday, color: "bg-teal-500" },
            { label: "พ่อแม่ / ครอบครัว", value: Math.min(s.family, r.needToday), color: "bg-amber-400" },
            { label: "เงินกู้", value: Math.min(s.loan, Math.max(0, r.needToday - s.family)), color: "bg-rose-400" },
          ]}
        />
      </Panel>
    </div>
  );

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-teal-700 uppercase">SME Planner</p>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">แผนการเงินเปิดธุรกิจของตัวเอง</h1>
            <p className="text-sm text-slate-500">ต้องมีเงินเท่าไหร่ เก็บกี่ปีถึงพอ และโอกาสรอดของธุรกิจใหม่</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${TONE[readyTone].chip}`}>
            {template?.icon} {template ? splitName(template.name).main : ""} · พร้อม {Math.floor(r.readyPct)}%
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        {/* มือถือ: ผลลัพธ์ขึ้นก่อน · จอใหญ่: ผลลัพธ์อยู่ขวา ติดจอ */}
        <div className="lg:sticky lg:top-4 lg:order-2">{results}</div>

        <div className="space-y-4 lg:order-1">
          <Panel step={1} title="ธุรกิจที่อยากทำ" desc="เลือกแบบที่ใกล้เคียง ตัวเลขเป็นค่าประมาณตั้งต้น แก้ได้ทุกช่อง">
            <div className={picking ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "grid"}>
              {TEMPLATES.filter((t) => picking || t.id === s.templateId).map((t) => {
                const on = s.templateId === t.id;
                const n = splitName(t.name);
                return (
                  <button
                    key={t.id}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                      on ? "border-teal-600 bg-teal-50 ring-2 ring-teal-600/30" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      if (!picking) return setPicking(true);
                      if (!on) setS((x) => fromTemplate(t, x));
                      setPicking(false);
                    }}
                    aria-pressed={on}
                    aria-expanded={!picking ? false : undefined}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-base leading-tight font-semibold ${on ? "text-teal-800" : "text-slate-900"}`}>{n.main}</span>
                      {n.sub && <span className="block text-xs leading-tight text-slate-500">{n.sub}</span>}
                    </span>
                    {!picking && <span className="shrink-0 text-sm font-medium text-teal-700">เปลี่ยน ▾</span>}
                  </button>
                );
              })}
            </div>
            {template?.note && <p className="mt-2 text-sm text-slate-500">{template.note}</p>}
          </Panel>

          <Panel step={2} title="เงินลงทุนเริ่มต้น" desc="จ่ายครั้งเดียวก่อนเปิด" right={<span className="shrink-0 font-semibold tabular-nums">{money(r.setupTotal)}</span>}>
            <label className="mb-3 flex items-start gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <input type="checkbox" className="mt-1 size-5 accent-teal-700" checked={s.ownSpace} onChange={(e) => set("ownSpace", e.target.checked)} />
              <span>
                <b className="text-slate-900">มีที่ดิน / ตึก / บ้านของตัวเองหรือครอบครัว</b>
                <span className="block text-sm text-slate-500">ไม่ต้องจ่ายค่าเช่าและเงินมัดจำ</span>
              </span>
            </label>
            <CostList items={s.setup} ownSpace={s.ownSpace} onChange={(xs) => set("setup", xs)} />
          </Panel>

          <Panel step={3} title="ค่าใช้จ่ายรายเดือน" desc="จ่ายทุกเดือนไม่ว่าจะขายได้หรือไม่" right={<span className="shrink-0 font-semibold tabular-nums">{money(r.monthlyBurn)}/ด.</span>}>
            <CostList items={s.monthly} ownSpace={s.ownSpace} onChange={(xs) => set("monthly", xs)} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MoneyInput label="เงินใช้จ่ายส่วนตัวต่อเดือน" value={s.ownerPay} onChange={(n) => set("ownerPay", n)} />
              <NumberField label="กำไรขั้นต้น (หลังหักต้นทุนสินค้า)" suffix="%" value={s.margin} onChange={(n) => set("margin", n)} min={1} max={95} />
            </div>
          </Panel>

          <Panel
            step={4}
            title="เงินหมุนเวียนสำรอง"
            desc="แนะนำ 6–12 เดือน"
            right={<span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TONE[runwayTone].chip}`}>{s.runwayMonths < 6 ? "เสี่ยง" : s.runwayMonths >= 12 ? "ดีมาก" : "พอใช้"}</span>}
          >
            <Slider value={s.runwayMonths} min={3} max={18} onChange={(n) => set("runwayMonths", n)} label="จำนวนเดือน" unit="เดือน" />
            <p className="mt-1 text-sm text-slate-500">รวม {money(r.runwayTotal)} · SME ไทยส่วนใหญ่มีสายป่านไม่ถึง 6 เดือน</p>
          </Panel>

          <Panel step={5} title="แหล่งเงินและการเก็บเงิน">
            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyInput label="เงินเก็บที่มีตอนนี้" value={s.savingsNow} onChange={(n) => set("savingsNow", n)} />
              <MoneyInput label="เก็บได้ต่อเดือน" value={s.savePerMonth} onChange={(n) => set("savePerMonth", n)} />
              <NumberField label="เก็บเพิ่มขึ้นปีละ" suffix="%/ปี" value={s.saveGrowth} onChange={(n) => set("saveGrowth", n)} max={20} step={0.5} />
            </div>
            <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
              <MoneyInput label="พ่อแม่ / ครอบครัวช่วย" value={s.family} onChange={(n) => set("family", n)} />
              <MoneyInput label="กู้ธนาคาร / สินเชื่อ SME" value={s.loan} onChange={(n) => set("loan", n)} />
            </div>
            {s.loan > 0 && <p className="mt-2 text-xs text-slate-500">เงินกู้ต้องผ่อนตั้งแต่เดือนแรก — ใส่ค่าผ่อนในค่าใช้จ่ายรายเดือนด้วย</p>}
          </Panel>

          <Panel step={6} title="อยากเริ่มในอีกกี่ปี">
            <Slider value={s.targetYears} min={1} max={20} onChange={(n) => set("targetYears", n)} label="จำนวนปี" unit="ปี" />
          </Panel>
        </div>

        {/* ความเสี่ยง: เต็มความกว้าง */}
        <div className="grid gap-4 lg:order-3 lg:col-span-2 lg:grid-cols-2">
          <Panel title="โอกาสรอดของธุรกิจใหม่" desc="สัดส่วนธุรกิจที่ยังเปิดอยู่หลังเปิดกิจการ (ประมาณ)">
            <SurvivalChart />
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>ราวครึ่งหนึ่งปิดก่อนครบ 5 ปี และเหลือราว 1 ใน 3 เมื่อครบ 10 ปี</li>
              <li>ร้านอาหาร/เครื่องดื่ม และก่อสร้าง ปิดกิจการมากที่สุดในไทยช่วงปี 2566–67</li>
              <li>ความเสี่ยงปิดกิจการของ SME ไทยเฉลี่ยราว 7% ต่อปี</li>
            </ul>
          </Panel>

          <Panel
            title="ความพร้อมก่อนลงเงิน"
            desc="ปัจจัยที่ช่วยให้รอดได้มากกว่าค่าเฉลี่ย"
            right={
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ${TONE[okCount >= 5 ? "good" : okCount >= 3 ? "warn" : "bad"].chip}`}>
                {okCount}/{factors.length}
              </span>
            }
          >
            <ul className="divide-y divide-slate-100">
              {factors.map((f) => {
                const auto = f.key === "runway" || f.key === "debt";
                return (
                  <li key={f.key} className="py-2">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 size-5 accent-teal-700"
                        checked={f.ok}
                        disabled={auto}
                        onChange={(e) => set("checks", { ...s.checks, [f.key]: e.target.checked })}
                      />
                      <span className="min-w-0">
                        <span className={`font-medium ${f.ok ? "text-emerald-700" : "text-slate-900"}`}>{f.label}</span>
                        <span className="block text-xs text-slate-500">
                          {f.hint}
                          {auto && " (คำนวณจากแผน)"}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-sm text-slate-700">
              {okCount >= 5
                ? "เตรียมตัวดีมาก โอกาสรอดน่าจะดีกว่าค่าเฉลี่ยของธุรกิจเกิดใหม่"
                : okCount >= 3
                  ? "เตรียมไว้พอสมควร ข้อที่ยังไม่ได้ทำคือการบ้านก่อนลงเงินจริง"
                  : "ยังเสี่ยงสูง ใช้เวลาระหว่างเก็บเงินฝึกและทดลองข้อที่ยังไม่ได้ทำ"}
            </p>
          </Panel>

          <p className="text-xs text-slate-400 lg:col-span-2">
            แหล่งข้อมูล: สำนักงานสถิติแรงงานสหรัฐ (BLS) ข้อมูลการอยู่รอดของสถานประกอบการเกิดใหม่ · ศูนย์วิจัยกสิกรไทย · สสว. · ตัวเลขเป็นค่าประมาณเพื่อวางแผน ไม่ใช่คำแนะนำการลงทุน ·
            ข้อมูลที่กรอกเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น
          </p>
        </div>
      </main>
    </div>
  );
}

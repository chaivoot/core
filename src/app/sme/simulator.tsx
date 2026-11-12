"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AUTO_INFLATION, plan, readiness, SURVIVAL, TEMPLATES, type CostItem, type PlanInput, type ReadinessKey, type Template } from "@/lib/sme/plan";

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const money = (n: number) => (Number.isFinite(n) ? `฿${thb.format(Math.round(n))}` : "—");
const short = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("th-TH", { maximumFractionDigits: 1 })} ล้าน` : `${Math.round(n / 1000).toLocaleString("th-TH")}k`;
const years = (y: number) => (Number.isInteger(y) ? `${y}` : y.toLocaleString("th-TH", { maximumFractionDigits: 1 }));

type State = PlanInput & { templateId: string; age: number; checks: Partial<Record<ReadinessKey, boolean>> };

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
    saveGrowth: prev?.saveGrowth ?? 5,
    age: prev?.age ?? 30,
    // ไม่คิดผลตอบแทนเงินเก็บ · เงินเฟ้อคิดให้อัตโนมัติ (ไม่ต้องกรอก)
    returnRate: 0,
    inflation: AUTO_INFLATION,
    targetYears: prev?.targetYears ?? 10,
    checks: prev?.checks ?? {},
  };
}

/** เลือกข้อความทั้งช่องตอนแตะ จะได้พิมพ์ทับได้เลย (มือถือไม่ต้องลบทีละตัว) */
const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select();

/** ปุ่มตัวเลือกด่วน */
function Chips<T extends number>({ options, value, onPick, format }: { options: T[]; value: number; onPick: (v: T) => void; format: (v: T) => string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onPick(o)}
          className={`min-h-10 rounded-full px-3.5 text-sm font-medium ring-1 transition active:scale-95 ${
            value === o ? "bg-sky-600 text-white ring-sky-600" : "bg-white text-slate-700 ring-slate-300 hover:bg-sky-50"
          }`}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}

/** ช่องเงินบาท (พิมพ์ได้ มีคอมมา) + ปุ่มจำนวนเงินด่วน */
function MoneyInput({ value, onChange, label, hint, big, quick }: { value: number; onChange: (n: number) => void; label?: string; hint?: string; big?: boolean; quick?: number[] }) {
  return (
    <div>
      <label className="block">
        {label && <span className="label">{label}</span>}
        <span className="relative block">
          <input
            className={`input pr-12 text-right tabular-nums ${big ? "min-h-14 border-sky-600 font-display text-2xl font-bold text-sky-900" : "min-h-12 text-lg"}`}
            inputMode="numeric"
            enterKeyHint="done"
            value={value ? thb.format(value) : ""}
            placeholder="0"
            onFocus={selectAll}
            onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-slate-400">บาท</span>
        </span>
      </label>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {quick && <Chips options={quick} value={value} onPick={onChange} format={(v) => (v ? short(v) : "0")} />}
    </div>
  );
}

/** ตัวเลขจำนวนเต็ม ปุ่ม − / + ใหญ่ กดง่ายบนมือถือ (พิมพ์เองได้ด้วย) */
function Stepper({ value, onChange, label, unit, min, max, step = 1, quick }: { value: number; onChange: (n: number) => void; label: string; unit: string; min: number; max: number; step?: number; quick?: number[] }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const btn = "flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-2xl font-bold text-sky-700 ring-1 ring-sky-200 transition active:scale-95 active:bg-sky-100 disabled:opacity-40";
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" className={btn} onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label={`ลด${label}`}>
          −
        </button>
        <label className="relative min-w-0 flex-1">
          <input
            className="input min-h-14 pr-14 text-center font-display text-2xl font-bold tabular-nums text-slate-900"
            inputMode="numeric"
            enterKeyHint="done"
            aria-label={label}
            value={value || ""}
            placeholder="0"
            onFocus={selectAll}
            onChange={(e) => onChange(Math.min(max, Number(e.target.value.replace(/[^\d]/g, "")) || 0))}
            onBlur={() => onChange(clamp(value))}
          />
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-slate-400">{unit}</span>
        </label>
        <button type="button" className={btn} onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label={`เพิ่ม${label}`}>
          +
        </button>
      </div>
      {quick && <Chips options={quick} value={value} onPick={onChange} format={(v) => `${v} ${unit}`} />}
    </div>
  );
}

/** รายการค่าใช้จ่าย: แก้ตัวเลขได้ทันที · โหมดจัดรายการ = แก้ชื่อ เพิ่ม ลบ */
function CostList({ items, onChange, ownSpace }: { items: CostItem[]; onChange: (xs: CostItem[]) => void; ownSpace: boolean }) {
  const [editing, setEditing] = useState(false);
  const update = (i: number, patch: Partial<CostItem>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div>
      <ul className="space-y-2">
        {items.map((it, i) => {
          const off = ownSpace && (it.tag === "rent" || it.tag === "deposit");
          return (
            <li key={i} className={`rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200 ${off ? "opacity-50" : ""}`}>
              {editing ? (
                <div className="mb-2 flex items-center gap-2">
                  <input className="input min-h-11 min-w-0 flex-1" value={it.label} aria-label="ชื่อรายการ" onChange={(e) => update(i, { label: e.target.value })} />
                  <button className="flex size-11 shrink-0 items-center justify-center rounded-xl text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50" aria-label="ลบรายการ" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                    🗑
                  </button>
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                {!editing && <span className={`min-w-0 flex-1 text-sm text-slate-700 ${off ? "line-through" : ""}`}>{it.label}</span>}
                <label className={`relative block ${editing ? "flex-1" : "w-40 shrink-0"}`}>
                  <input
                    className="input min-h-12 pr-11 text-right text-lg tabular-nums"
                    inputMode="numeric"
                    enterKeyHint="next"
                    aria-label={it.label}
                    value={it.amount ? thb.format(it.amount) : ""}
                    placeholder="0"
                    onFocus={selectAll}
                    onChange={(e) => update(i, { amount: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400">บาท</span>
                </label>
              </div>
            </li>
          );
        })}
      </ul>
      {ownSpace && items.some((x) => x.tag) && <p className="mt-2 text-xs text-slate-500">รายการจาง = ไม่นับ เพราะมีที่/ตึกของตัวเองแล้ว</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {editing && (
          <button className="min-h-11 rounded-xl border border-dashed border-sky-500 px-4 text-sm font-semibold text-sky-700 hover:bg-sky-50" onClick={() => onChange([...items, { label: "รายการใหม่", amount: 0 }])}>
            + เพิ่มรายการ
          </button>
        )}
        <button
          className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${editing ? "bg-sky-700 text-white hover:bg-sky-800" : "border border-sky-600 bg-white text-sky-700 hover:bg-sky-50"}`}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "✓ เสร็จ" : "✎ แก้ชื่อ / เพิ่ม / ลบรายการ"}
        </button>
      </div>
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
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 font-display text-base font-semibold text-slate-900 sm:text-lg">
            {step !== undefined && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white shadow-sm shadow-sky-600/30">{step}</span>
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
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold tabular-nums sm:text-2xl ${TONE[tone].text}`}>{value}</p>
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

/** วงแหวนความพร้อม (%) */
function Ring({ pct, tone }: { pct: number; tone: Tone }) {
  const R = 40;
  const C = 2 * Math.PI * R;
  const v = Math.min(100, Math.max(0, pct));
  const color = tone === "good" ? "#34d399" : tone === "warn" ? "#fbbf24" : "#fb7185";
  return (
    <div className="relative size-28 shrink-0 sm:size-32">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - v / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{Math.floor(pct)}%</span>
        <span className="text-[11px] text-sky-100/80">พร้อม</span>
      </div>
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
          <div className="flex h-28 w-full items-end overflow-hidden rounded-md bg-slate-100">
            <div
              className={`w-full rounded-md bg-gradient-to-t ${x.pct >= 60 ? "from-emerald-600 to-emerald-400" : x.pct >= 45 ? "from-amber-500 to-amber-300" : "from-rose-500 to-rose-300"}`}
              style={{ height: `${x.pct}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">ปีที่ {x.year}</span>
        </div>
      ))}
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
        <line x1={x(target)} x2={x(target)} y1={pad.t} y2={H - pad.b} stroke="#0369a1" strokeDasharray="4 4" />
        <text x={x(target) + 4} y={pad.t + 12} fontSize="11" fill="#0369a1">
          เป้าหมาย
        </text>
        <path d={path("need")} fill="none" stroke="#e11d48" strokeWidth="2" strokeDasharray="6 4" />
        <path d={`${path("saved")}L${x(maxX)},${y(0)}L${x(0)},${y(0)}Z`} fill="#0284c7" opacity="0.08" />
        <path d={path("saved")} fill="none" stroke="#0284c7" strokeWidth="2.5" />
        {ready !== null && ready <= maxX && <circle cx={x(ready)} cy={y(series[Math.min(series.length - 1, Math.round(ready))].saved)} r="5" fill="#0284c7" />}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 bg-sky-600" /> เงินเก็บสะสม
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-rose-600" /> เงินที่ต้องเก็บเอง
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * บันทึกหน้าผลลัพธ์เป็น PDF (A4) — ถ่ายภาพหน้าจอด้วยเบราว์เซอร์เอง ภาษาไทยและฟอนต์จึงตรงกับที่เห็น
 * ตัดหน้าตรงรอยต่อระหว่างการ์ด ไม่ให้การ์ดขาดกลาง · โหลดไลบรารีเฉพาะตอนกดเท่านั้น
 */
async function downloadPdf(el: HTMLElement, filename: string) {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const W = 760;
  const prev = el.style.cssText;
  // ซ่อนปุ่มต่าง ๆ ก่อนวัดตำแหน่ง (ไม่ให้ตำแหน่งตัดหน้าเพี้ยน)
  const hidden = [...el.querySelectorAll<HTMLElement>("[data-no-pdf]")];
  hidden.forEach((n) => (n.style.display = "none"));
  el.style.width = `${W}px`;
  el.style.padding = "24px";
  el.style.background = "#f8fafc";
  try {
    const H = el.scrollHeight;
    const top0 = el.getBoundingClientRect().top;
    const blocks = [...el.children].map((c) => {
      const b = c.getBoundingClientRect();
      return { top: b.top - top0, bottom: b.bottom - top0 };
    });
    const img = await toJpeg(el, { quality: 0.92, pixelRatio: 2, width: W, height: H, backgroundColor: "#f8fafc" });

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const mm = pageW / W; // mm ต่อ px
    const pageHpx = pageH / mm;
    // หาจุดตัดหน้า: ก่อนการ์ดที่จะล้นหน้า
    const cuts = [0];
    for (const b of blocks) {
      const start = cuts[cuts.length - 1];
      if (b.bottom - start > pageHpx && b.top > start) cuts.push(b.top - 12);
    }
    cuts.push(H);
    for (let i = 0; i < cuts.length - 1; i++) {
      // การ์ดที่ยาวกว่าหนึ่งหน้า: แบ่งต่อเป็นหลายหน้า
      for (let y = cuts[i]; y < cuts[i + 1]; y += pageHpx) {
        if (i > 0 || y > 0) pdf.addPage();
        const end = Math.min(cuts[i + 1], y + pageHpx);
        pdf.addImage(img, "JPEG", 0, -y * mm, pageW, H * mm);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, (end - y) * mm, pageW, pageH, "F");
      }
    }
    // ดาวน์โหลดผ่านลิงก์เอง ให้ได้ชื่อไฟล์ตามที่ตั้ง
    const url = URL.createObjectURL(pdf.output("blob"));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } finally {
    el.style.cssText = prev;
    hidden.forEach((n) => (n.style.display = ""));
  }
}

const STEPS = [
  { icon: "🏪", short: "ธุรกิจ", title: "อยากทำธุรกิจอะไร", desc: "เลือกแบบที่ใกล้เคียงที่สุด ตัวเลขตั้งต้นแก้ได้ทุกช่องในขั้นต่อไป" },
  { icon: "🛠️", short: "ลงทุน", title: "เงินลงทุนเริ่มต้น", desc: "จ่ายครั้งเดียวก่อนเปิดร้าน แตะตัวเลขเพื่อแก้ได้เลย" },
  { icon: "📅", short: "รายเดือน", title: "ค่าใช้จ่ายรายเดือน", desc: "จ่ายทุกเดือน ไม่ว่าจะขายได้หรือไม่" },
  { icon: "🛟", short: "สำรอง", title: "เงินหมุนเวียนสำรอง", desc: "เงินจ่ายค่าใช้จ่ายรายเดือนช่วงที่ร้านยังไม่มีกำไร" },
  { icon: "💰", short: "เงินเก็บ", title: "เงินเก็บของคุณ", desc: "ตัวกำหนดว่าจะใช้เวลาเก็บกี่ปี" },
  { icon: "🎯", short: "เป้าหมาย", title: "อายุและเป้าหมาย", desc: "อยากเปิดร้านภายในกี่ปี" },
  { icon: "📊", short: "ผลลัพธ์", title: "ผลลัพธ์แผนของคุณ", desc: "" },
] as const;
const LAST = STEPS.length - 1;

export function SmeSimulator() {
  const [s, setS] = useState<State>(() => fromTemplate(TEMPLATES[0]));
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);

  // จำแผนที่กรอกไว้ในเบราว์เซอร์เครื่องนี้ · เคยกรอกแล้ว เปิดมาเจอหน้าผลลัพธ์เลย
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่านค่าที่บันทึกไว้ครั้งเดียวตอนเปิดหน้า
        setS({ ...fromTemplate(TEMPLATES[0]), ...JSON.parse(raw), returnRate: 0, inflation: AUTO_INFLATION });
        setStep(LAST);
      }
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

  const go = (n: number) => {
    setStep(Math.min(LAST, Math.max(0, n)));
    scrollTo({ top: 0 });
  };

  const set = <K extends keyof State>(k: K, v: State[K]) => setS((x) => ({ ...x, [k]: v }));
  const r = useMemo(() => plan(s), [s]);
  const factors = readiness(r, s, s.checks);
  const okCount = factors.filter((f) => f.ok).length;
  const template = TEMPLATES.find((t) => t.id === s.templateId);
  const late = r.yearsToReady === null ? null : r.yearsToReady - s.targetYears;
  const resultRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const savePdf = async () => {
    if (!resultRef.current || pdfBusy) return;
    setPdfBusy(true);
    try {
      // ชื่อไฟล์ภาษาอังกฤษ: บางเบราว์เซอร์ทิ้งชื่อไทยแล้วตั้งเป็น "download"
      await downloadPdf(resultRef.current, `sme-plan-${s.templateId}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      alert("สร้าง PDF ไม่สำเร็จ ลองเปิดด้วย Chrome หรือ Safari แล้วกดอีกครั้ง");
    } finally {
      setPdfBusy(false);
    }
  };
  const reset = () => {
    if (!confirm("ล้างข้อมูลที่กรอกทั้งหมด แล้วเริ่มใหม่?")) return;
    setS(fromTemplate(TEMPLATES[0]));
    go(0);
  };

  const readyTone: Tone = r.readyPct >= 100 ? "good" : r.readyPct >= 70 ? "warn" : "bad";
  const timeTone: Tone = late === null ? "bad" : late <= 0 ? "good" : late <= 3 ? "warn" : "bad";
  const runwayTone: Tone = s.runwayMonths >= 12 ? "good" : s.runwayMonths >= 6 ? "warn" : "bad";
  const yearsText = r.yearsToReady === null ? "40+ ปี" : `${years(Math.ceil(r.yearsToReady * 2) / 2)} ปี`;
  /** อายุตอนเปิดธุรกิจได้จริง (ตามแผน) และอายุที่ตั้งเป้าไว้ */
  const readyAge = r.yearsToReady === null ? null : Math.floor(s.age + r.yearsToReady);
  const targetAge = s.age + s.targetYears;
  const bizName = template ? splitName(template.name).main : "ธุรกิจ";
  const today = new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

  const pages: React.ReactNode[] = [
    // 1 ธุรกิจ
    <div key="biz" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {TEMPLATES.map((t) => {
        const on = s.templateId === t.id;
        const n = splitName(t.name);
        return (
          <button
            key={t.id}
            className={`flex min-h-20 flex-col items-start gap-1 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
              on ? "border-sky-600 bg-sky-50 ring-2 ring-sky-600/30" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
            onClick={() => {
              if (!on) setS((x) => fromTemplate(t, x));
              go(1);
            }}
            aria-pressed={on}
          >
            <span className="text-3xl">{t.icon}</span>
            <span className={`text-base leading-tight font-semibold ${on ? "text-sky-800" : "text-slate-900"}`}>{n.main}</span>
            {n.sub && <span className="text-xs leading-tight text-slate-500">{n.sub}</span>}
          </button>
        );
      })}
    </div>,

    // 2 ลงทุน
    <div key="setup" className="space-y-4">
      <label className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <input type="checkbox" className="mt-0.5 size-6 accent-sky-700" checked={s.ownSpace} onChange={(e) => set("ownSpace", e.target.checked)} />
        <span>
          <b className="text-slate-900">มีที่ดิน / ตึก / บ้านของตัวเองหรือครอบครัว</b>
          <span className="block text-sm text-slate-500">ไม่ต้องจ่ายค่าเช่าและเงินมัดจำ</span>
        </span>
      </label>
      <CostList items={s.setup} ownSpace={s.ownSpace} onChange={(xs) => set("setup", xs)} />
      {template?.note && <p className="text-sm text-slate-500">💡 {template.note}</p>}
    </div>,

    // 3 รายเดือน
    <div key="monthly" className="space-y-5">
      <CostList items={s.monthly} ownSpace={s.ownSpace} onChange={(xs) => set("monthly", xs)} />
      <MoneyInput label="เงินใช้จ่ายส่วนตัวต่อเดือน" hint="ช่วงที่ร้านยังไม่มีกำไร ต้องมีเงินกินอยู่ด้วย" value={s.ownerPay} onChange={(n) => set("ownerPay", n)} quick={[10_000, 15_000, 20_000, 30_000]} />
      <Stepper label="กำไรขั้นต้น (หลังหักต้นทุนสินค้า)" unit="%" value={s.margin} onChange={(n) => set("margin", n)} min={1} max={95} step={5} />
    </div>,

    // 4 สำรอง
    <div key="runway" className="space-y-4">
      <Stepper label="สำรองไว้กี่เดือน" unit="เดือน" value={s.runwayMonths} onChange={(n) => set("runwayMonths", n)} min={1} max={24} quick={[6, 9, 12]} />
      <div className={`rounded-2xl p-4 text-sm ring-1 ${TONE[runwayTone].chip}`}>
        <p className="font-display text-xl font-bold tabular-nums">{money(r.runwayTotal)}</p>
        <p>
          {money(r.monthlyBurn)}/เดือน × {s.runwayMonths} เดือน · {s.runwayMonths < 6 ? "เสี่ยง แนะนำอย่างน้อย 6 เดือน" : s.runwayMonths >= 12 ? "ดีมาก" : "พอใช้ ถ้าได้ 12 เดือนจะดีมาก"}
        </p>
      </div>
      <p className="text-sm text-slate-500">SME ไทยส่วนใหญ่มีสายป่านไม่ถึง 6 เดือน</p>
    </div>,

    // 5 เงินเก็บ
    <div key="savings" className="space-y-5">
      <MoneyInput label="เงินเก็บที่มีตอนนี้" value={s.savingsNow} onChange={(n) => set("savingsNow", n)} big quick={[0, 50_000, 100_000, 300_000, 500_000]} />
      <MoneyInput label="เก็บได้ต่อเดือน" value={s.savePerMonth} onChange={(n) => set("savePerMonth", n)} quick={[3_000, 5_000, 10_000, 20_000]} />
      <Stepper label="เก็บเพิ่มขึ้นปีละ (เงินเดือนขึ้น)" unit="%" value={s.saveGrowth} onChange={(n) => set("saveGrowth", n)} min={0} max={20} quick={[0, 3, 5, 10]} />
      <div className="space-y-4 border-t border-slate-200 pt-4">
        <p className="text-sm font-semibold text-slate-700">เงินจากที่อื่น (ถ้ามี)</p>
        <MoneyInput label="พ่อแม่ / ครอบครัวช่วย" value={s.family} onChange={(n) => set("family", n)} />
        <MoneyInput label="กู้ธนาคาร / สินเชื่อ SME" value={s.loan} onChange={(n) => set("loan", n)} hint={s.loan > 0 ? "เงินกู้ต้องผ่อนตั้งแต่เดือนแรก — ใส่ค่าผ่อนในค่าใช้จ่ายรายเดือนด้วย" : undefined} />
      </div>
    </div>,

    // 6 เป้าหมาย
    <div key="goal" className="space-y-5">
      <Stepper label="อายุตอนนี้" unit="ปี" value={s.age} onChange={(n) => set("age", n)} min={15} max={80} />
      <Stepper label="อยากเปิดร้านในอีกกี่ปี" unit="ปี" value={s.targetYears} onChange={(n) => set("targetYears", n)} min={1} max={30} quick={[3, 5, 10, 15]} />
      <p className="rounded-2xl bg-sky-50 p-4 text-sky-900 ring-1 ring-sky-200">
        🎯 เป้าหมาย: เปิด{bizName}ตอน <b className="font-display text-xl">อายุ {targetAge}</b>
      </p>
    </div>,

    // 7 ผลลัพธ์
    <div key="result" ref={resultRef} className="space-y-4">
      <div data-no-pdf="1" className="flex flex-wrap items-center gap-2">
        <button onClick={savePdf} disabled={pdfBusy} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60">
          {pdfBusy ? "กำลังสร้าง PDF…" : "⬇ ดาวน์โหลดเป็น PDF"}
        </button>
      </div>
      {/* หัวรายงาน (ติดไปใน PDF ด้วย) */}
      <div className="flex items-end justify-between gap-3 border-b border-slate-200 pb-2">
        <div>
          <p className="font-display text-lg font-bold text-slate-900">
            {template?.icon} แผนเปิด{bizName}
          </p>
          <p className="text-xs text-slate-500">อายุ {s.age} ปี · เป้าหมายเปิดในอีก {s.targetYears} ปี (อายุ {targetAge})</p>
        </div>
        <p className="shrink-0 text-right text-xs text-slate-400">
          {today}
          <br />
          3s1m.com/sme
        </p>
      </div>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-sky-800 to-slate-900 p-5 text-white shadow-lg shadow-sky-900/20 sm:p-6">
        <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-sky-400/20 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-sky-100">ต้องมีเงินทั้งหมด</p>
            <p className="mt-1 font-display text-[2rem] leading-none font-bold tabular-nums min-[400px]:text-4xl sm:text-5xl">{money(r.needToday)}</p>
            <p className="mt-2 text-sm text-sky-100/80">
              ลงทุน {short(r.setupTotal)} + สำรอง {s.runwayMonths} เดือน {short(r.runwayTotal)}
            </p>
          </div>
          <Ring pct={r.readyPct} tone={readyTone} />
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3 text-sm">
          <div>
            <p className="text-sky-100/80">ปีที่ {s.targetYears} ต้องเก็บเอง</p>
            <p className="text-lg font-bold tabular-nums">{money(r.needAtTarget)}</p>
          </div>
          <div>
            <p className="text-sky-100/80">ถึงปีที่ {s.targetYears} จะมี</p>
            <p className="text-lg font-bold tabular-nums">{money(r.savedAtTarget)}</p>
          </div>
        </div>
        <p className="relative mt-2 text-xs text-sky-100/70">ราคาวันนี้ · ปีต่อ ๆ ไปคิดเงินเฟ้อให้อัตโนมัติ {AUTO_INFLATION}%/ปี</p>
      </div>

      <div className={`rounded-2xl p-4 ring-1 sm:p-5 ${TONE[timeTone].chip}`}>
        <p className="text-sm">ถ้าเก็บเงินตามแผนนี้ คุณจะเปิด{bizName}ได้ตอน</p>
        <p className="mt-0.5 font-display text-3xl font-bold tabular-nums sm:text-4xl">{readyAge === null ? `อายุเกิน ${s.age + 40} ปี` : `อายุ ${readyAge} ปี`}</p>
        <p className="mt-1 text-sm">
          {late === null
            ? `เก็บ 40 ปีก็ยังไม่พอ ต้องเก็บเดือนละ ${money(r.savePerMonthNeeded)} ถึงจะเปิดได้ตอนอายุ ${targetAge}`
            : late <= 0
              ? `✓ ทันเป้าที่ตั้งไว้ (อายุ ${targetAge}) · อีก ${yearsText}`
              : `ช้ากว่าเป้า (อายุ ${targetAge}) ${years(Math.ceil(late * 2) / 2)} ปี · ถ้าอยากทัน ต้องเก็บเดือนละ ${money(r.savePerMonthNeeded)}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="เก็บเงินครบใน" value={yearsText} tone={timeTone} sub={late === null ? "ยังไม่พอภายใน 40 ปี" : late <= 0 ? "✓ ทันตามเป้า" : `ช้ากว่าเป้า ${years(Math.ceil(late * 2) / 2)} ปี`} />
        <Kpi
          label="ต้องเก็บเดือนละ"
          value={r.readyPct >= 100 ? "✓ พอแล้ว" : money(r.savePerMonthNeeded)}
          tone={r.readyPct >= 100 ? "good" : "warn"}
          sub={r.readyPct >= 100 ? `เก็บ ${money(s.savePerMonth)} ก็ทัน` : `ให้ทันปีที่ ${s.targetYears} (ตอนนี้ ${money(s.savePerMonth)})`}
        />
        <div className="col-span-2 sm:col-span-1">
          <Kpi label="ยอดขายคุ้มทุน/วัน" value={money(r.breakEvenSales / 26)} sub={`${money(r.breakEvenSales)}/เดือน (เปิด 26 วัน)`} />
        </div>
      </div>

      <Panel title="เงินเก็บสะสม vs เงินที่ต้องมี" desc={`เส้นประ = เงินที่ต้องเก็บเอง (แพงขึ้นตามเงินเฟ้อ ${AUTO_INFLATION}%/ปี)`}>
        <Chart series={r.series} target={s.targetYears} ready={r.yearsToReady} />
      </Panel>

      <Panel title="เงินที่ต้องใช้ มาจากไหน ไปไหน">
        <p className="mb-2 text-xs font-medium text-slate-500">ใช้ไปกับ</p>
        <Breakdown
          total={r.needToday}
          parts={[
            { label: "เงินลงทุนเริ่มต้น", value: r.setupTotal, color: "bg-indigo-500" },
            { label: `เงินหมุนเวียน ${s.runwayMonths} เดือน`, value: r.runwayTotal, color: "bg-violet-400" },
          ]}
        />
        <p className="mt-4 mb-2 text-xs font-medium text-slate-500">มาจาก</p>
        <Breakdown
          total={r.needToday}
          parts={[
            { label: "เงินเก็บของตัวเอง", value: r.ownNeedToday, color: "bg-sky-500" },
            { label: "พ่อแม่ / ครอบครัว", value: Math.min(s.family, r.needToday), color: "bg-amber-400" },
            { label: "เงินกู้", value: Math.min(s.loan, Math.max(0, r.needToday - s.family)), color: "bg-rose-400" },
          ]}
        />
      </Panel>

      <Panel title="ข้อมูลที่ใช้คำนวณ" right={<span data-no-pdf="1"><button onClick={() => go(1)} className="min-h-9 rounded-lg px-3 text-sm font-semibold text-sky-700 ring-1 ring-sky-600 hover:bg-sky-50">✎ แก้ไข</button></span>}>
        <dl className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
          {(
            [
              ["ธุรกิจ", template?.name ?? "—"],
              ["มีที่ดิน/ตึกของตัวเอง", s.ownSpace ? "มี" : "ไม่มี (เช่า)"],
              ["เงินลงทุนเริ่มต้น", money(r.setupTotal)],
              ["ค่าใช้จ่ายร้าน/เดือน", money(r.monthlyBusiness)],
              ["เงินใช้ส่วนตัว/เดือน", money(s.ownerPay)],
              ["กำไรขั้นต้น", `${s.margin}%`],
              ["เงินสำรอง", `${s.runwayMonths} เดือน`],
              ["เงินเก็บตอนนี้", money(s.savingsNow)],
              ["เก็บต่อเดือน", `${money(s.savePerMonth)} (เพิ่มปีละ ${s.saveGrowth}%)`],
              ["ครอบครัวช่วย / เงินกู้", `${money(s.family)} / ${money(s.loan)}`],
              ["เงินเฟ้อ (อัตโนมัติ)", `${AUTO_INFLATION}%/ปี`],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-right font-medium text-slate-900 tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>

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
        right={<span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ${TONE[okCount >= 5 ? "good" : okCount >= 3 ? "warn" : "bad"].chip}`}>{okCount}/{factors.length}</span>}
      >
        <ul className="divide-y divide-slate-100">
          {factors.map((f) => {
            const auto = f.key === "runway" || f.key === "debt";
            return (
              <li key={f.key}>
                <label className="flex min-h-12 items-start gap-3 py-2.5">
                  <input type="checkbox" className="mt-0.5 size-6 accent-sky-700" checked={f.ok} disabled={auto} onChange={(e) => set("checks", { ...s.checks, [f.key]: e.target.checked })} />
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

      <p className="text-xs text-slate-400">
        แหล่งข้อมูล: สำนักงานสถิติแรงงานสหรัฐ (BLS) ข้อมูลการอยู่รอดของสถานประกอบการเกิดใหม่ · ศูนย์วิจัยกสิกรไทย · สสว. · ตัวเลขเป็นค่าประมาณเพื่อวางแผน ไม่ใช่คำแนะนำการลงทุน ·
        ข้อมูลที่กรอกเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น
      </p>
    </div>,
  ];

  const cur = STEPS[step];
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="bg-gradient-to-br from-slate-900 via-slate-900 to-sky-900 text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pt-4 pb-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-sky-200">📊 SME Planner</p>
            <h1 className="truncate font-display text-lg font-bold sm:text-xl">แผนการเงินเปิดธุรกิจของตัวเอง</h1>
          </div>
          <button onClick={reset} className="min-h-10 shrink-0 rounded-lg px-3 text-sm text-slate-300 ring-1 ring-white/20 hover:bg-white/10 hover:text-white">
            ↺ เริ่มใหม่
          </button>
        </div>
        {/* สรุปสด: เห็นผลทันทีขณะกรอก (ซ่อนในหน้าผลลัพธ์) */}
        {step < LAST && (
          <div className="mx-auto max-w-2xl px-4 pb-3">
            <button onClick={() => go(LAST)} className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-2 text-left ring-1 ring-white/15 hover:bg-white/15">
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] text-slate-300">ต้องมีทั้งหมด</span>
                <span className="block font-display font-bold tabular-nums">{money(r.needToday)}</span>
              </span>
              <span className="text-right">
                <span className="block text-[11px] text-slate-300">พร้อม</span>
                <span className={`block font-display font-bold tabular-nums ${readyTone === "good" ? "text-emerald-300" : readyTone === "warn" ? "text-amber-300" : "text-rose-300"}`}>{Math.floor(r.readyPct)}%</span>
              </span>
              <span className="text-right">
                <span className="block text-[11px] text-slate-300">เปิดได้ตอนอายุ</span>
                <span className="block font-display font-bold tabular-nums">{readyAge ?? `${s.age + 40}+`}</span>
              </span>
            </button>
          </div>
        )}
        <div className="h-1 bg-white/10">
          <div className="h-full bg-sky-400 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-5 pb-44">
        <p className="text-sm font-medium text-sky-700">
          ขั้นที่ {step + 1} / {STEPS.length}
        </p>
        <h2 className="mt-0.5 font-display text-2xl font-bold text-slate-900">
          {cur.icon} {cur.title}
        </h2>
        {cur.desc && <p className="mt-1 text-slate-500">{cur.desc}</p>}
        {step === 1 && <p className="mt-2 font-display text-lg font-semibold text-slate-900">รวม {money(r.setupTotal)}</p>}
        {step === 2 && <p className="mt-2 font-display text-lg font-semibold text-slate-900">รวม {money(r.monthlyBurn)}/เดือน (รวมเงินใช้ส่วนตัว)</p>}
        <div className="mt-4">{pages[step]}</div>
      </main>

      {/* เมนูขั้นตอนด้านล่าง: แตะเพื่อย้อนกลับไปแก้ขั้นไหนก็ได้ */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.15)] backdrop-blur" aria-label="ขั้นตอน">
        <div className="mx-auto max-w-2xl px-2 pt-2">
          <ol className="grid grid-cols-7 gap-0.5">
            {STEPS.map((st, i) => {
              const on = i === step;
              return (
                <li key={st.short}>
                  <button
                    onClick={() => go(i)}
                    aria-current={on ? "step" : undefined}
                    className={`flex w-full flex-col items-center gap-0.5 rounded-xl py-1.5 transition ${on ? "bg-sky-50 text-sky-800" : i < step ? "text-slate-700 hover:bg-slate-50" : "text-slate-400 hover:bg-slate-50"}`}
                  >
                    <span className={`flex size-8 items-center justify-center rounded-full text-base ${on ? "bg-sky-600 shadow-sm shadow-sky-600/30" : i < step ? "bg-sky-100" : "bg-slate-100"}`}>{st.icon}</span>
                    <span className={`text-[11px] leading-tight ${on ? "font-semibold" : ""}`}>{st.short}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex gap-2 py-2">
            <button onClick={() => go(step - 1)} disabled={step === 0} className="min-h-12 flex-1 rounded-xl font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-40">
              ← ย้อนกลับ
            </button>
            {step < LAST ? (
              <button onClick={() => go(step + 1)} className="min-h-12 flex-[2] rounded-xl bg-sky-600 font-semibold text-white shadow-sm shadow-sky-600/30 transition hover:bg-sky-700 active:scale-[0.98]">
                {step === LAST - 1 ? "ดูผลลัพธ์ 📊" : "ถัดไป →"}
              </button>
            ) : (
              <button onClick={() => go(0)} className="min-h-12 flex-[2] rounded-xl bg-sky-600 font-semibold text-white shadow-sm shadow-sky-600/30 transition hover:bg-sky-700 active:scale-[0.98]">
                ✎ แก้แผนตั้งแต่ขั้นแรก
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}

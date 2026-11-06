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
    returnRate: prev?.returnRate ?? 3,
    inflation: prev?.inflation ?? 3,
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

const STAGE_COLORS = ["bg-sky-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-emerald-500", "bg-indigo-500"];

/** การ์ดแต่ละ "ด่าน" สไตล์เกม: ขอบหนา เงาด้านล่าง ป้ายเลขด่าน */
function Section({ n, title, children, desc, icon }: { n: number; title: string; desc?: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl border-2 border-stone-800/80 border-b-[6px] bg-white p-4 shadow-[0_6px_0_0_rgba(0,0,0,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className={`flex size-12 shrink-0 -rotate-3 flex-col items-center justify-center rounded-2xl border-2 border-stone-800/80 border-b-4 text-white ${STAGE_COLORS[(n - 1) % STAGE_COLORS.length]}`}>
          <span className="text-[10px] leading-none font-bold tracking-wide uppercase">ด่าน</span>
          <span className="font-game text-xl leading-none">{n}</span>
        </span>
        <div className="min-w-0">
          <h2 className="font-game text-xl leading-tight">
            {icon} {title}
          </h2>
          {desc && <p className="mt-1 text-sm text-stone-500">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** แถบพลังแบบเกม (ลายทาง เลื่อนได้) */
function PowerBar({ pct, tone }: { pct: number; tone: "good" | "mid" | "bad" }) {
  const color = tone === "good" ? "bg-emerald-400" : tone === "mid" ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="h-4 overflow-hidden rounded-full border-2 border-stone-800/80 bg-stone-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{
          width: `${Math.max(3, Math.min(100, pct))}%`,
          backgroundImage: "repeating-linear-gradient(-45deg, rgba(255,255,255,.35) 0 6px, transparent 6px 12px)",
        }}
      />
    </div>
  );
}

/** ดาว 1–3 ดวงตามความพร้อม */
function Stars({ n }: { n: number }) {
  return (
    <span className="text-3xl tracking-tight" aria-label={`${n} ดาว`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? "drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]" : "opacity-25 grayscale"}>
          ⭐
        </span>
      ))}
    </span>
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
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e7e5e4" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#78716c">
              {short(t)}
            </text>
          </g>
        ))}
        {series
          .filter((s) => s.year % (maxX > 20 ? 5 : 2) === 0)
          .map((s) => (
            <text key={s.year} x={x(s.year)} y={H - 8} textAnchor="middle" fontSize="11" fill="#78716c">
              {s.year === 0 ? "วันนี้" : `ปี ${s.year}`}
            </text>
          ))}
        <line x1={x(target)} x2={x(target)} y1={pad.t} y2={H - pad.b} stroke="#0f766e" strokeDasharray="4 4" />
        <text x={x(target) + 4} y={pad.t + 12} fontSize="11" fill="#0f766e">
          เป้าหมาย
        </text>
        <path d={path("need")} fill="none" stroke="#e11d48" strokeWidth="2.5" />
        <path d={path("saved")} fill="none" stroke="#0d9488" strokeWidth="2.5" />
        {ready !== null && ready <= maxX && <circle cx={x(ready)} cy={y(series[Math.min(series.length - 1, Math.round(ready))].saved)} r="5" fill="#0d9488" />}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-xs text-stone-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 bg-teal-600" /> เงินเก็บสะสม
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 bg-rose-600" /> เงินที่ต้องเก็บเอง (แพงขึ้นตามเงินเฟ้อ)
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
      if (raw) setS({ ...fromTemplate(TEMPLATES[0]), ...JSON.parse(raw) });
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

  const tone = r.readyPct >= 100 ? "good" : r.readyPct >= 70 ? "mid" : "bad";
  const stars = r.readyPct >= 100 ? 3 : r.readyPct >= 70 ? 2 : 1;

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#bae6fd_0%,#e0f2fe_30%,#fef3c7_100%)]">
      {/* HUD: ติดด้านบนตลอด เหมือนแถบพลังในเกม */}
      <div className="sticky top-0 z-30 border-b-2 border-stone-800/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
          <span className="text-2xl">{template?.icon ?? "🏪"}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between text-xs font-semibold text-stone-600">
              <span>พร้อมเปิดร้านในปีที่ {s.targetYears}</span>
              <span className="font-game text-base text-stone-900">{Math.floor(r.readyPct)}%</span>
            </div>
            <PowerBar pct={r.readyPct} tone={tone} />
          </div>
          <div className="hidden shrink-0 text-center leading-tight sm:block">
            <p className="text-[10px] font-semibold text-stone-500">⏳ เก็บครบใน</p>
            <p className="font-game">{r.yearsToReady === null ? "40+" : years(Math.ceil(r.yearsToReady * 2) / 2)} ปี</p>
          </div>
          <div className="shrink-0 rounded-xl border-2 border-stone-800/80 border-b-4 bg-amber-300 px-2 py-0.5 text-center leading-tight">
            <p className="text-[10px] font-semibold">🏅 พร้อม</p>
            <p className="font-game">
              {okCount}/{factors.length}
            </p>
          </div>
        </div>
      </div>

    <main className="mx-auto max-w-3xl space-y-5 p-4 pb-16 sm:p-6">
      <header className="space-y-2 py-4 text-center">
        <p className="inline-block animate-bounce text-5xl">🏪</p>
        <p className="mx-auto w-fit rounded-full border-2 border-stone-800/80 bg-amber-300 px-3 py-0.5 text-xs font-bold tracking-wide">🎮 ภารกิจ: เปิดธุรกิจของตัวเอง</p>
        <h1 className="font-game text-3xl text-stone-900 drop-shadow-[0_3px_0_rgba(255,255,255,0.9)] sm:text-4xl">จำลองแผนเปิดธุรกิจ</h1>
        <p className="text-stone-700">ผ่าน 6 ด่าน แล้วดูว่าต้องมีเงินเท่าไหร่ เก็บกี่ปีถึงพอ และต้องเจอบอสอะไรหลังเปิดร้าน</p>
      </header>

      <Section n={1} icon="🗺️" title="เลือกร้านในฝัน" desc="เลือกแบบที่ใกล้เคียง ตัวเลขทุกช่องเป็นค่าประมาณตั้งต้น แก้ให้ตรงกับแผนของคุณได้">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center text-sm transition active:translate-y-1 active:border-b-2 ${
                s.templateId === t.id
                  ? "translate-y-0.5 border-stone-800 border-b-2 bg-teal-500 font-semibold text-white"
                  : "border-stone-800/70 border-b-[5px] bg-white hover:-translate-y-0.5 hover:bg-sky-50"
              }`}
              onClick={() => setS((x) => fromTemplate(t, x))}
            >
              <span className="text-3xl">{t.icon}</span>
              {t.name}
            </button>
          ))}
        </div>
        {template?.note && <p className="text-sm text-stone-500">{template.note}</p>}
      </Section>

      <Section n={2} icon="🧱" title="เงินลงทุนเริ่มต้น" desc="จ่ายครั้งเดียวก่อนเปิด: ตกแต่ง อุปกรณ์ มัดจำ ใบอนุญาต ของล็อตแรก">
        <label className="flex items-start gap-3 rounded-2xl bg-amber-50 p-3">
          <input type="checkbox" className="mt-1 size-5" checked={s.ownSpace} onChange={(e) => set("ownSpace", e.target.checked)} />
          <span>
            <b>มีที่ดิน / ตึก / บ้านของตัวเองหรือครอบครัวใช้ทำร้านได้</b>
            <span className="block text-sm text-stone-600">ไม่ต้องจ่ายค่าเช่าและเงินมัดจำ</span>
          </span>
        </label>
        <CostList items={s.setup} ownSpace={s.ownSpace} onChange={(xs) => set("setup", xs)} />
        <p className="text-right font-semibold">รวม {money(r.setupTotal)}</p>
      </Section>

      <Section n={3} icon="🔥" title="ค่าใช้จ่ายรายเดือน" desc="จ่ายทุกเดือนไม่ว่าจะขายได้หรือไม่ (ไม่รวมต้นทุนสินค้า ซึ่งคิดผ่านกำไรขั้นต้น)">
        <CostList items={s.monthly} ownSpace={s.ownSpace} onChange={(xs) => set("monthly", xs)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <MoneyInput label="เงินใช้จ่ายส่วนตัวของคุณต่อเดือน" value={s.ownerPay} onChange={(n) => set("ownerPay", n)} />
          <NumberField label="กำไรขั้นต้น (หลังหักต้นทุนสินค้า)" suffix="%" value={s.margin} onChange={(n) => set("margin", n)} min={1} max={95} />
        </div>
        <p className="text-right font-semibold">ค่าใช้จ่ายต่อเดือนช่วงตั้งตัว (ธุรกิจ + ตัวคุณ) {money(r.monthlyBurn)}</p>
      </Section>

      <Section n={4} icon="🛡️" title="เกราะเงินหมุนเวียน" desc="ช่วงแรกยอดขายยังไม่เข้าที่ ต้องมีเงินจ่ายค่าใช้จ่ายรายเดือนไว้ก่อน แนะนำ 6–12 เดือน">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={3}
            max={18}
            value={s.runwayMonths}
            onChange={(e) => set("runwayMonths", Number(e.target.value))}
            className="flex-1 accent-teal-700"
            aria-label="จำนวนเดือน"
          />
          <span className="w-20 text-right text-lg font-bold">{s.runwayMonths} เดือน</span>
        </div>
        <p className={`text-sm ${s.runwayMonths < 6 ? "text-rose-700" : s.runwayMonths >= 12 ? "text-emerald-700" : "text-stone-600"}`}>
          {s.runwayMonths < 6
            ? "⚠ น้อยกว่า 6 เดือน เสี่ยงเงินหมดก่อนธุรกิจตั้งตัวได้"
            : s.runwayMonths >= 12
              ? "✓ สำรอง 12 เดือนขึ้นไป รับมือช่วงยอดขายยังไม่เข้าที่ได้ดี"
              : "พอใช้ได้ ถ้าไหวลองเผื่อถึง 12 เดือน"}{" "}
          · รวม {money(r.runwayTotal)}
        </p>
      </Section>

      <Section n={5} icon="💰" title="แหล่งเงินและการเก็บเงิน">
        <div className="grid gap-3 sm:grid-cols-2">
          <MoneyInput label="เงินเก็บที่มีตอนนี้" value={s.savingsNow} onChange={(n) => set("savingsNow", n)} />
          <MoneyInput label="เก็บได้ต่อเดือน" value={s.savePerMonth} onChange={(n) => set("savePerMonth", n)} />
          <NumberField label="เก็บได้เพิ่มขึ้นปีละ (เงินเดือนขึ้น)" suffix="%/ปี" value={s.saveGrowth} onChange={(n) => set("saveGrowth", n)} max={20} step={0.5} />
          <NumberField label="ผลตอบแทนเงินเก็บ" suffix="%/ปี" value={s.returnRate} onChange={(n) => set("returnRate", n)} max={15} step={0.5} />
          <NumberField label="ค่าเปิดร้านแพงขึ้น (เงินเฟ้อ)" suffix="%/ปี" value={s.inflation} onChange={(n) => set("inflation", n)} max={10} step={0.5} />
        </div>
        <div className="grid gap-3 border-t border-stone-100 pt-3 sm:grid-cols-2">
          <MoneyInput label="👨‍👩‍👧 พ่อแม่ / ครอบครัวช่วย" value={s.family} onChange={(n) => set("family", n)} />
          <MoneyInput label="🏦 กู้ธนาคาร / สินเชื่อ SME" value={s.loan} onChange={(n) => set("loan", n)} />
        </div>
        {s.loan > 0 && <p className="text-xs text-stone-500">เงินกู้ต้องผ่อนคืนพร้อมดอกเบี้ย ตั้งแต่เดือนแรกที่ยังไม่มีกำไร — ใส่ค่าผ่อนในค่าใช้จ่ายรายเดือนด้วย</p>}
      </Section>

      <Section n={6} icon="🎯" title="อยากเริ่มในอีกกี่ปี">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={20}
            value={s.targetYears}
            onChange={(e) => set("targetYears", Number(e.target.value))}
            className="flex-1 accent-teal-700"
            aria-label="จำนวนปี"
          />
          <span className="w-16 text-right text-lg font-bold">{s.targetYears} ปี</span>
        </div>
      </Section>

      {/* ---------- ผลลัพธ์ ---------- */}
      <section className="space-y-4 rounded-3xl border-2 border-stone-800 border-b-[8px] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-game text-2xl">🏆 ผลภารกิจ</h2>
          <Stars n={stars} />
        </div>

        <div className="space-y-1 rounded-2xl border-2 border-dashed border-stone-300 bg-amber-50 p-4">
          <Row label="เงินลงทุนเริ่มต้น" value={money(r.setupTotal)} />
          <Row label={`เงินหมุนเวียน ${s.runwayMonths} เดือน`} value={money(r.runwayTotal)} />
          <Row label="ต้องมีเงินทั้งหมด (ราคาวันนี้)" value={money(r.needToday)} strong />
          {s.family > 0 && <Row label="หักพ่อแม่ / ครอบครัวช่วย" value={`−${money(s.family)}`} />}
          {s.loan > 0 && <Row label="หักเงินกู้" value={`−${money(s.loan)}`} />}
          <Row label="ต้องเก็บเอง (ราคาวันนี้)" value={money(r.ownNeedToday)} strong />
          {s.inflation > 0 && (
            <Row label={`อีก ${s.targetYears} ปี ต้องเก็บเอง (ค่าเปิดร้านแพงขึ้น ${s.inflation}%/ปี)`} value={money(r.needAtTarget)} strong />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`rounded-2xl border-2 border-stone-800/70 border-b-4 p-4 ${r.readyPct >= 100 ? "bg-emerald-100" : r.readyPct >= 70 ? "bg-amber-100" : "bg-rose-100"}`}>
            <p className="text-sm text-stone-600">ถึงปีที่ {s.targetYears} คุณจะพร้อม</p>
            <p className="font-game text-5xl">{Math.floor(r.readyPct)}%</p>
            <div className="mt-2">
              <PowerBar pct={r.readyPct} tone={tone} />
            </div>
            <p className="mt-1 text-sm text-stone-600">
              มีเงิน {money(r.savedAtTarget)} จาก {money(r.needAtTarget)}
            </p>
          </div>
          <div className="rounded-2xl border-2 border-stone-800/70 border-b-4 bg-sky-100 p-4">
            <p className="text-sm text-stone-600">⏳ เก็บเงินได้พอในอีก</p>
            <p className="font-game text-5xl">{r.yearsToReady === null ? "40+ ปี" : `${years(Math.ceil(r.yearsToReady * 2) / 2)} ปี`}</p>
            <p className="mt-1 text-sm">
              {late === null ? (
                <span className="text-rose-700">ด้วยแผนนี้ยังเก็บไม่พอภายใน 40 ปี</span>
              ) : late <= 0 ? (
                <span className="text-emerald-700">✓ ทันตามเป้า{late < -0.5 ? ` เร็วกว่าเป้า ${years(Math.floor(-late * 2) / 2)} ปี` : ""}</span>
              ) : (
                <span className="text-rose-700">ช้ากว่าเป้า {years(Math.ceil(late * 2) / 2)} ปี</span>
              )}
            </p>
            {r.readyPct < 100 && (
              <p className="mt-1 text-sm text-stone-600">
                ถ้าอยากทันใน {s.targetYears} ปี ต้องเก็บเดือนละ <b>{money(r.savePerMonthNeeded)}</b>
              </p>
            )}
          </div>
        </div>

        <Chart series={r.series} target={s.targetYears} ready={r.yearsToReady} />

        <div className="rounded-2xl border-2 border-stone-800/70 border-b-4 bg-violet-100 p-4">
          <p className="font-game text-lg">🎯 เป้ายอดขายเพื่อคุ้มทุน</p>
          <p className="mt-1 text-sm text-stone-700">
            ต้องขายได้เดือนละ <b>{money(r.breakEvenSales)}</b> (≈ วันละ <b>{money(r.breakEvenSales / 26)}</b> ถ้าเปิด 26 วัน) ถึงจะพอจ่ายค่าใช้จ่ายทุกอย่างรวมเงินเดือนตัวเอง
          </p>
          <p className="mt-1 text-xs text-stone-500">
            = ค่าใช้จ่ายต่อเดือน {money(r.monthlyBurn)} ÷ กำไรขั้นต้น {s.margin}% · ยังไม่รวมการคืนทุนเงินลงทุนเริ่มต้น
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border-2 border-stone-800 border-b-[8px] bg-stone-900 p-4 text-stone-100 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="text-5xl">👾</span>
          <div>
            <p className="text-xs font-bold tracking-widest text-rose-400 uppercase">บอสด่านสุดท้าย</p>
            <h2 className="font-game text-2xl">10 ปีแรกของธุรกิจ</h2>
          </div>
        </div>
        <p className="text-sm text-stone-300">เปิดร้านได้แล้วยังไม่จบเกม สถิติบอกว่าธุรกิจใหม่ปิดตัวมากกว่าที่คนส่วนใหญ่คิด</p>
        <div className="space-y-2">
          {SURVIVAL.map((x) => (
            <div key={x.year} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 text-stone-300">ปีที่ {x.year}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-full border-2 border-stone-600 bg-rose-900/60">
                <div className="flex h-full items-center justify-end rounded-full bg-emerald-500 pr-2 text-xs font-semibold text-white" style={{ width: `${x.pct}%` }}>
                  ~{x.pct}%
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-stone-400">❤️ สัดส่วนธุรกิจที่ยังเปิดอยู่ (ประมาณ) · ราวครึ่งหนึ่งปิดก่อนครบ 5 ปี และเหลือราว 1 ใน 3 เมื่อครบ 10 ปี</p>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-300">
          <li>ร้านอาหาร/เครื่องดื่ม และก่อสร้าง เป็นกลุ่มที่ปิดกิจการมากที่สุดในไทยช่วงปี 2566–67</li>
          <li>SME ไทยส่วนใหญ่มีสายป่าน (เงินหมุนเวียน) เหลือไม่เกิน 6 เดือน — เงินหมุนเวียนจึงสำคัญพอ ๆ กับเงินลงทุน</li>
          <li>ความเสี่ยงปิดกิจการของ SME ไทยเฉลี่ยราว 7% ต่อปี และสูงขึ้นในช่วงเศรษฐกิจไม่ดี</li>
        </ul>

        <div className="rounded-2xl border-2 border-stone-800 border-b-4 bg-white p-4 text-stone-900">
          <p className="font-game text-lg">
            🏅 อาวุธสู้บอส {okCount}/{factors.length}
          </p>
          <p className="text-sm text-stone-600">ปลดล็อกให้ครบ ช่วยให้รอดได้มากกว่าค่าเฉลี่ย (ติ๊กข้อที่ทำแล้ว)</p>
          <ul className="mt-2 space-y-2">
            {factors.map((f) => {
              const auto = f.key === "runway" || f.key === "debt";
              return (
                <li key={f.key}>
                  <label className={`flex items-start gap-3 rounded-xl border-2 p-2 transition ${f.ok ? "border-emerald-500 bg-emerald-50" : "border-dashed border-stone-300"}`}>
                    <input
                      type="checkbox"
                      className="mt-1 size-5"
                      checked={f.ok}
                      disabled={auto}
                      onChange={(e) => set("checks", { ...s.checks, [f.key]: e.target.checked })}
                    />
                    <span>
                      <span className={f.ok ? "font-medium text-emerald-800" : "font-medium"}>
                        {f.ok ? "🏅 " : "🔒 "}
                        {f.label}
                      </span>
                      <span className="block text-xs text-stone-500">
                        {f.hint}
                        {auto && " (คำนวณจากแผน)"}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-stone-700">
            {okCount >= 5
              ? "เตรียมตัวดีมาก โอกาสรอดของคุณน่าจะดีกว่าค่าเฉลี่ยของธุรกิจเกิดใหม่"
              : okCount >= 3
                ? "เตรียมไว้พอสมควร ข้อที่ยังไม่ได้ทำคือการบ้านก่อนลงเงินจริง"
                : "ยังเสี่ยงสูง ลองทำข้อที่ยังไม่ได้ติ๊กก่อน — ใช้เวลาระหว่างเก็บเงินฝึกและทดลองได้"}
          </p>
        </div>

        <p className="text-xs text-stone-500">
          แหล่งข้อมูล: สำนักงานสถิติแรงงานสหรัฐ (BLS) ข้อมูลการอยู่รอดของสถานประกอบการเกิดใหม่ · ศูนย์วิจัยกสิกรไทย · สำนักงานส่งเสริมวิสาหกิจขนาดกลางและขนาดย่อม (สสว.) ·
          ตัวเลขเป็นค่าประมาณเพื่อวางแผน ไม่ใช่คำแนะนำการลงทุน
        </p>
      </section>

      <p className="text-center text-xs text-stone-500">ข้อมูลที่กรอกเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ไม่ได้ส่งไปที่ไหน</p>
    </main>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "border-t border-stone-200 pt-1 font-bold" : "text-sm text-stone-700"}`}>
      <span>{label}</span>
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

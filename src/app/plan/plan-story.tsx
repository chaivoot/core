"use client";

import { useMemo, useState } from "react";
import {
  DISCOUNT_TABLE,
  LEADER_RATE,
  PV_TO_BV,
  RETAIL_PROFIT,
  basketPerMonth,
  corePlus,
  corePlusMonthly,
  evaluate,
  fmt,
  fmt0,
  nextStep,
  planIncome,
  uniformTree,
  type Household,
  type NodeResult,
  type PlanNode,
} from "@/lib/plan";

export type PlanProduct = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  pv: number;
  bv: number;
  days: number;
};

const STEPS = ["เริ่ม", "สินค้า", "ลูกค้า", "ตาราง", "แนะนำ", "ถ่ายทอด", "ชั้นที่ 3", "สรุป"];
const LAST = STEPS.length - 1;
/** ตัวอย่างในคู่มือ: แต่ละบ้านขายสินค้าได้ 18,000 บาท */
const MANUAL_BV = 18_000;

export function PlanStory({ products }: { products: PlanProduct[] }) {
  const [step, setStep] = useState(0);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [manual, setManual] = useState(false);
  const [customers, setCustomers] = useState(2);
  const [levels, setLevels] = useState([3, 3, 0]);

  const basket = useMemo(
    () =>
      basketPerMonth(
        products.map((p) => ({ price: p.price, pv: p.pv, bv: p.bv, days: p.days, qty: qty[p.id] ?? 0 })),
      ),
    [products, qty],
  );

  const home: Household = manual
    ? { pv: MANUAL_BV / PV_TO_BV, bv: MANUAL_BV, retailBv: MANUAL_BV }
    : { pv: basket.pv, bv: basket.bv, retailBv: 0 };
  const cust = manual ? 0 : customers;

  // แต่ละขั้นเล่าเพิ่มทีละชั้น
  const depth = step <= 3 ? 0 : step === 4 ? 1 : step === 5 ? 2 : 3;
  const tree = uniformTree(home, cust, levels.slice(0, depth));
  const result = evaluate(tree);
  const income = planIncome(result);
  const extra = depth > 0 ? corePlusMonthly(corePlus(tree)) : 0;

  const go = (n: number) => {
    setStep(Math.min(Math.max(n, 0), LAST));
    window.scrollTo({ top: 0 });
  };
  const setLevel = (i: number, v: number) => setLevels((l) => l.map((x, j) => (j === i ? v : x)));

  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-5xl gap-6 px-4 pt-5 pb-28 md:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="min-w-0">
        <Progress step={step} onGo={go} />

        <div className="sticky top-0 z-10 -mx-4 mt-3 space-y-2 bg-stone-50/95 px-4 py-2 backdrop-blur md:mx-0 md:px-0">
          <RateStrip r={result} />
          {step === 1 && !manual && <BasketSummary basket={basket} />}
        </div>

        <div className="mt-4 space-y-4">
          {step === 0 && <Intro />}

          {step === 1 && (
            <ProductStep
              products={products}
              qty={qty}
              setQty={setQty}
              manual={manual}
              setManual={(m) => {
                setManual(m);
                if (m) setLevels([3, 0, 0]);
              }}
            />
          )}

          {step === 2 && (
            <>
              <Title
                kicker="ขั้นที่ 2"
                title={manual ? "ขายให้ลูกค้า" : "ลูกค้าที่ใช้แบบเดียวกับเรา"}
                text={
                  manual
                    ? "ตัวอย่างในคู่มือ: แต่ละบ้านขายสินค้าได้เดือนละ 18,000 บาท"
                    : "บ้านที่ซื้อสินค้าชุดเดียวกับบ้านเราผ่านเรา เราได้กำไรขายปลีก และยอดนับรวมเป็นของเรา"
                }
              />
              {!manual && (
                <Stepper label="ลูกค้า" unit="บ้าน" value={customers} max={20} onChange={setCustomers} />
              )}
              <Result r={result} node={tree} />
            </>
          )}

          {step === 3 && <TableStep r={result} />}

          {step === 4 && (
            <>
              <Title
                kicker="ขั้นที่ 4"
                title="แนะนำเพื่อนให้ทำแบบเดียวกับเรา"
                text="คนที่เราสปอนเซอร์ใช้สินค้าและมีลูกค้าเท่ากับบ้านเรา ยอดของทุกคนนับรวมเป็นกลุ่มของเรา"
              />
              <Stepper label="เราแนะนำ" unit="คน" value={levels[0]} max={10} onChange={(v) => setLevel(0, v)} />
              <Diagram r={result} node={tree} levels={levels.slice(0, 1)} />
              <Result r={result} node={tree} />
              <CorePlusCard node={tree} />
            </>
          )}

          {step === 5 && (
            <>
              <Title
                kicker="ขั้นที่ 5"
                title="ถ่ายทอดแบบอย่าง"
                text="คนที่เราแนะนำ ทำแบบเดียวกับเรา คือแนะนำต่อคนละกี่คน"
              />
              <Stepper
                label="แต่ละคนแนะนำต่อ"
                unit="คน"
                value={levels[1]}
                max={10}
                onChange={(v) => setLevel(1, v)}
              />
              <Diagram r={result} node={tree} levels={levels.slice(0, 2)} />
              <Result r={result} node={tree} />
              <CorePlusCard node={tree} />
            </>
          )}

          {step === 6 && (
            <>
              <Title kicker="ขั้นที่ 6" title="ขยายต่ออีกชั้น" text="แล้วคนในชั้นที่ 2 แนะนำต่ออีกคนละกี่คน" />
              <Stepper
                label="ชั้นที่ 2 แนะนำต่อ"
                unit="คน"
                value={levels[2]}
                max={10}
                onChange={(v) => setLevel(2, v)}
              />
              <Diagram r={result} node={tree} levels={levels} />
              <Result r={result} node={tree} />
              <CorePlusCard node={tree} />
            </>
          )}

          {step === 7 && (
            <Summary
              r={result}
              node={tree}
              onRestart={() => {
                setQty({});
                setManual(false);
                setCustomers(2);
                setLevels([3, 3, 0]);
                go(0);
              }}
            />
          )}
        </div>
      </div>

      <aside className="hidden md:block">
        <RateSide r={result} />
      </aside>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
          <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => go(step - 1)}>
            ย้อน
          </button>
          <div className="min-w-0 flex-1 text-center">
            {step >= 2 && (
              <>
                <div className="text-xs text-stone-500">ประมาณต่อเดือน</div>
                <div className="text-lg leading-tight font-bold text-teal-800">฿{fmt0(income)}</div>
                {extra > 0 && (
                  <div className="text-xs font-medium text-violet-700">+ คอร์พลัส ฿{fmt0(extra)}</div>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={step === LAST || (step === 1 && !manual && basket.pv === 0)}
            onClick={() => go(step + 1)}
          >
            {step === 0 ? "เริ่ม" : "ต่อไป"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function Progress({ step, onGo }: { step: number; onGo: (n: number) => void }) {
  return (
    <ol className="flex gap-1" aria-label="ขั้นตอน">
      {STEPS.map((s, i) => (
        <li key={s} className="flex-1">
          <button
            type="button"
            onClick={() => onGo(i)}
            className="block w-full"
            aria-current={i === step ? "step" : undefined}
            aria-label={s}
          >
            <span className={`block h-1.5 rounded-full ${i <= step ? "bg-teal-600" : "bg-stone-200"}`} />
            <span
              className={`mt-1 hidden text-center text-xs sm:block ${
                i === step ? "font-semibold text-teal-800" : "text-stone-400"
              }`}
            >
              {s}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function Title({ kicker, title, text }: { kicker: string; title: string; text?: string }) {
  return (
    <header>
      <p className="text-sm text-teal-700">{kicker}</p>
      <h1 className="text-2xl font-bold text-stone-900">{title}</h1>
      {text && <p className="mt-1 text-stone-600">{text}</p>}
    </header>
  );
}

function Disclaimer() {
  return (
    <p className="rounded-xl bg-stone-100 p-3 text-xs leading-relaxed text-stone-600">
      ตัวเลขทั้งหมดเป็นตัวเลขสมมติเพื่อใช้อธิบายแผนธุรกิจแอมเวย์ คำนวณตามสูตรในคู่มือดำเนินธุรกิจ
      (อัตราส่วน พีวี : บีวี = 1 : {PV_TO_BV}) รายได้จริงขึ้นอยู่กับความพยายามในการดำเนินธุรกิจของแต่ละคน
      ไม่ใช่การรับประกันรายได้ โปรแกรมคอร์พลัสเป็นไปตามเงื่อนไขของบริษัทในปีคุณสมบัติ 2569/70
    </p>
  );
}

function Intro() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-teal-700">แผนธุรกิจแอมเวย์</p>
        <h1 className="text-3xl font-bold text-stone-900">ใช้สินค้าที่ดี แล้วแนะนำต่อ</h1>
      </header>
      <ol className="space-y-3">
        {[
          ["เลือกสินค้าที่บ้านเราใช้", "รู้ว่าวันละกี่บาท และได้ยอด PV เท่าไหร่"],
          ["ลูกค้าที่ใช้แบบเดียวกัน", "ได้กำไรขายปลีก และยอดเพิ่มขึ้น"],
          ["แนะนำเพื่อน และถ่ายทอดแบบอย่าง", "ยอดของทุกคนรวมเป็นกลุ่มของเรา"],
          ["ดูรายได้ตามสูตรของบริษัท", "ส่วนลดรายเดือน ส่วนลดแตกต่าง ผู้นำ 6% และคอร์พลัส"],
        ].map(([t, d], i) => (
          <li key={t} className="card flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-700 font-semibold text-white">
              {i + 1}
            </span>
            <div>
              <div className="font-medium text-stone-900">{t}</div>
              <div className="text-sm text-stone-600">{d}</div>
            </div>
          </li>
        ))}
      </ol>
      <Disclaimer />
    </div>
  );
}

function ProductStep({
  products,
  qty,
  setQty,
  manual,
  setManual,
}: {
  products: PlanProduct[];
  qty: Record<string, number>;
  setQty: (f: (q: Record<string, number>) => Record<string, number>) => void;
  manual: boolean;
  setManual: (m: boolean) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, PlanProduct[]>();
    for (const p of products) {
      const key = p.category ?? "อื่นๆ";
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map.entries()];
  }, [products]);

  const change = (id: string, d: number) =>
    setQty((q) => ({ ...q, [id]: Math.min(Math.max((q[id] ?? 0) + d, 0), 20) }));

  if (manual) {
    return (
      <>
        <Title kicker="ขั้นที่ 1" title="ตัวอย่างในคู่มือบริษัท" text="แต่ละบ้านมียอดขายเดือนละ 18,000 บาท (บีวี)" />
        <div className="card text-center">
          <div className="text-4xl font-bold text-stone-900">฿{fmt0(MANUAL_BV)}</div>
          <Volume pv={MANUAL_BV / PV_TO_BV} bv={MANUAL_BV} className="mt-1 text-lg text-stone-600" />
        </div>
        <button type="button" className="btn-ghost w-full" onClick={() => setManual(false)}>
          กลับไปเลือกสินค้า
        </button>
      </>
    );
  }

  return (
    <>
      <Title kicker="ขั้นที่ 1" title="สินค้าที่บ้านเราใช้" text="แตะเพื่อเพิ่ม · บ้านละ 2 คน ใส่ 2 ชุด" />

      {products.length === 0 && (
        <p className="card text-stone-600">ยังไม่มีข้อมูลสินค้า (ผู้ดูแลเพิ่มได้ที่หน้าข้อมูลสินค้า)</p>
      )}

      {groups.map(([cat, list]) => (
        <section key={cat} className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-500">{cat}</h2>
          <ul className="space-y-2">
            {list.map((p) => {
              const n = qty[p.id] ?? 0;
              return (
                <li
                  key={p.id}
                  className={`card flex items-center gap-3 ${n > 0 ? "ring-2 ring-teal-600" : ""}`}
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => change(p.id, 1)}>
                    <div className="font-medium text-stone-900">{p.name}</div>
                    {p.description && <div className="text-sm text-stone-600">{p.description}</div>}
                    <div className="text-sm text-stone-500">
                      ฿{fmt(p.price)} ใช้ได้ {p.days} วัน
                    </div>
                    <div className="text-sm text-stone-500">
                      {fmt(p.pv)} PV · {fmt(p.bv)} BV
                    </div>
                    <div className="text-sm font-semibold text-teal-800">วันละ ฿{fmt(p.price / p.days)}</div>
                  </button>
                  {n > 0 && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="btn-secondary size-10 min-h-10 px-0"
                        aria-label={`ลด ${p.name}`}
                        onClick={() => change(p.id, -1)}
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-lg font-semibold">{n}</span>
                      <button
                        type="button"
                        className="btn-secondary size-10 min-h-10 px-0"
                        aria-label={`เพิ่ม ${p.name}`}
                        onClick={() => change(p.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <button type="button" className="btn-ghost w-full text-sm" onClick={() => setManual(true)}>
        ใช้ตัวอย่างในคู่มือบริษัทแทน (18,000 บาท)
      </button>
    </>
  );
}

function BasketSummary({ basket }: { basket: ReturnType<typeof basketPerMonth> }) {
  return (
    <div className="card grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-stone-500">วันละ</div>
            <div className="text-xl font-bold text-teal-800">฿{fmt(basket.perDay)}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">เดือนละ (30 วัน)</div>
            <div className="text-xl font-bold text-stone-900">฿{fmt0(basket.price)}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">ยอดต่อเดือน</div>
            <Volume pv={basket.pv} bv={basket.bv} className="text-xl font-bold text-stone-900" />
          </div>
        </div>
  );
}

function Stepper({
  label,
  unit,
  value,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="card flex items-center justify-between gap-3">
      <span className="font-medium text-stone-700">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary size-11 px-0 text-xl"
          aria-label={`ลด ${label}`}
          disabled={value <= 0}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <span className="w-16 text-center">
          <span className="text-2xl font-bold text-stone-900">{value}</span>{" "}
          <span className="text-sm text-stone-500">{unit}</span>
        </span>
        <button
          type="button"
          className="btn-secondary size-11 px-0 text-xl"
          aria-label={`เพิ่ม ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Line({ label, formula, amount }: { label: string; formula?: string; amount: number }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div>
        <div className="text-stone-700">{label}</div>
        {formula && <div className="text-xs text-stone-500">{formula}</div>}
      </div>
      <div className="shrink-0 font-semibold text-stone-900">฿{fmt(amount)}</div>
    </li>
  );
}

/** รายละเอียดรายได้ตามแผนหลัก พร้อมสูตร */
function Result({ r, node }: { r: NodeResult; node: PlanNode }) {
  const leg = r.legs[0];
  const legs = r.legs.length;
  return (
    <section className="card space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-sm text-stone-500">ยอดกลุ่มของเรา</div>
          <Volume pv={r.groupPv} bv={r.groupBv} className="text-xl font-bold text-stone-900" />
        </div>
        <div className="text-right">
          <div className="text-sm text-stone-500">ส่วนลด</div>
          <div className="text-3xl font-bold text-teal-800">{r.rate}%</div>
        </div>
      </div>
      <NextHint pv={r.groupPv} />
      <ul className="divide-y divide-stone-100">
        {r.retail > 0 && (
          <Line
            label="กำไรขายปลีก"
            formula={`${fmt0(node.retailBv)} × ${RETAIL_PROFIT * 100}%`}
            amount={r.retail}
          />
        )}
        <Line label="ส่วนลดจากยอดซื้อส่วนตัว" formula={`${fmt0(node.bv)} × ${r.rate}%`} amount={r.own} />
        {leg && (
          <Line
            label="ส่วนลดแตกต่าง"
            formula={`${fmt0(leg.groupBv)} × (${r.rate}% − ${leg.rate}%) × ${legs} สาย`}
            amount={r.differential}
          />
        )}
        {r.leaderLegs > 0 && (
          <Line
            label="ส่วนลดพิเศษผู้นำ 6%"
            formula={
              r.leader > 0
                ? `สาย 21% ${r.leaderLegs} สาย × ${LEADER_RATE * 100}%` +
                  (r.leaderDeductPv > 0 ? ` (หักหลักประกันขั้นต่ำ ${fmt0(r.leaderDeductPv)} PV)` : "")
                : "ยังไม่ได้ เพราะยอดกลุ่มส่วนตัวต่ำกว่า 55,000 PV"
            }
            amount={r.leader}
          />
        )}
      </ul>
      <div className="flex items-baseline justify-between border-t border-stone-200 pt-2">
        <span className="font-semibold text-stone-900">รวมต่อเดือน</span>
        <span className="text-2xl font-bold text-teal-800">฿{fmt(planIncome(r))}</span>
      </div>
      <p className="text-xs text-stone-500">บีวี (บาท) คำนวณจาก พีวี × {PV_TO_BV}</p>
    </section>
  );
}

/** ยอดแสดงทั้ง PV และ BV คนละบรรทัด */
function Volume({ pv, bv, className = "" }: { pv: number; bv: number; className?: string }) {
  return (
    <div className={className}>
      <div>{fmt0(pv)} PV</div>
      <div className="text-[0.8em] font-medium opacity-75">{fmt0(bv)} BV</div>
    </div>
  );
}

function NextHint({ pv }: { pv: number }) {
  const next = nextStep(pv);
  if (!next) return null;
  return (
    <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
      อีก {fmt0(next.missingPv)} PV จะได้ {next.rate}%
    </p>
  );
}

function TableStep({ r }: { r: NodeResult }) {
  return (
    <>
      <Title
        kicker="ขั้นที่ 3"
        title="ตารางส่วนลดประจำเดือน"
        text="ยอดรวมของกลุ่มยิ่งมาก เปอร์เซ็นต์ส่วนลดยิ่งสูง คิดใหม่ทุกเดือน"
      />
      <div className="card overflow-hidden p-0">
        <table className="w-full text-center">
          <thead className="bg-stone-100 text-sm text-stone-600">
            <tr>
              <th className="py-2 font-medium">พีวี</th>
              <th className="py-2 font-medium">บีวี (บาท)</th>
              <th className="py-2 font-medium">ส่วนลด</th>
            </tr>
          </thead>
          <tbody>
            {DISCOUNT_TABLE.map((row) => {
              const here = row.rate === r.rate;
              return (
                <tr key={row.rate} className={here ? "bg-teal-700 text-white" : "border-t border-stone-100"}>
                  <td className="py-2">{fmt0(row.pv)}</td>
                  <td className="py-2">{fmt0(row.bv)}</td>
                  <td className="py-2 font-semibold">
                    {row.rate}%{here && " ← เรา"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="card text-center">
        <div className="text-sm text-stone-500">ตอนนี้ยอดของเรา</div>
        <Volume pv={r.groupPv} bv={r.groupBv} className="text-2xl font-bold text-stone-900" />
        <div className="mt-2">
          <NextHint pv={r.groupPv} />
        </div>
      </div>
    </>
  );
}

/** แผนภาพวงกลม: เราอยู่กลาง สายงานรอบตัว พร้อมยอดในทุกวง */
function Diagram({ r, node, levels }: { r: NodeResult; node: PlanNode; levels: number[] }) {
  const n = levels[0] ?? 0;
  if (n === 0) return null;
  const size = 360;
  const c = size / 2;
  const ring = 122;
  // จำนวนคนใต้แต่ละสาย (ไม่นับหัวสาย)
  let below = 0;
  let width = 1;
  for (const k of levels.slice(1)) {
    width *= k;
    below += width;
  }
  const leg = r.legs[0];
  const legRate = leg?.rate ?? 21;
  const legPv = leg?.groupPv ?? (r.groupPv - node.pv) / n;
  const legBv = leg?.groupBv ?? (r.groupBv - node.bv) / n;

  return (
    <figure className="card">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-md" role="img" aria-label="ผังสายงาน">
        {Array.from({ length: n }, (_, i) => {
          const a = (2 * Math.PI * i) / n - Math.PI / 2;
          const x = c + ring * Math.cos(a);
          const y = c + ring * Math.sin(a);
          return (
            <g key={i}>
              <line x1={c} y1={c} x2={x} y2={y} className="stroke-stone-300" strokeWidth={2} />
              <circle cx={x} cy={y} r={36} className="fill-teal-50 stroke-teal-600" strokeWidth={2} />
              <text x={x} y={y - 10} textAnchor="middle" className="fill-teal-900 text-[14px] font-bold">
                {legRate}%
              </text>
              <text x={x} y={y + 5} textAnchor="middle" className="fill-stone-700 text-[9.5px] font-medium">
                {fmt0(legPv)} PV
              </text>
              <text x={x} y={y + 17} textAnchor="middle" className="fill-stone-500 text-[9.5px]">
                {fmt0(legBv)} BV
              </text>
              {below > 0 && (
                <text x={x} y={y + 50} textAnchor="middle" className="fill-stone-500 text-[10px]">
                  {1 + below} รหัส
                </text>
              )}
            </g>
          );
        })}
        <circle cx={c} cy={c} r={50} className="fill-teal-700" />
        <text x={c} y={c - 22} textAnchor="middle" className="fill-white text-[12px]">
          เรา
        </text>
        <text x={c} y={c - 2} textAnchor="middle" className="fill-white text-[18px] font-bold">
          {r.rate}%
        </text>
        <text x={c} y={c + 15} textAnchor="middle" className="fill-teal-50 text-[10px]">
          {fmt0(r.groupPv)} PV
        </text>
        <text x={c} y={c + 28} textAnchor="middle" className="fill-teal-100 text-[10px]">
          {fmt0(r.groupBv)} BV
        </text>
      </svg>
      <figcaption className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-stone-50 p-2">
          <div className="text-xs text-stone-500">แต่ละรหัส</div>
          <Volume pv={node.pv} bv={node.bv} className="font-semibold text-stone-900" />
        </div>
        <div className="rounded-lg bg-stone-50 p-2">
          <div className="text-xs text-stone-500">แต่ละสาย ({1 + below} รหัส)</div>
          <Volume pv={legPv} bv={legBv} className="font-semibold text-stone-900" />
        </div>
        <div className="rounded-lg bg-teal-50 p-2">
          <div className="text-xs text-teal-800">ทั้งกลุ่มของเรา</div>
          <Volume pv={r.groupPv} bv={r.groupBv} className="font-semibold text-teal-900" />
        </div>
      </figcaption>
    </figure>
  );
}

/** ตารางส่วนลด แถบบนจอมือถือ: เราอยู่ขั้นไหน สายงานอยู่ขั้นไหน */
function RateStrip({ r }: { r: NodeResult }) {
  const legRate = r.legs[0]?.rate ?? (r.leaderLegs > 0 ? 21 : null);
  return (
    <div className="md:hidden">
      <ol className="grid grid-cols-7 gap-1 text-center" aria-label="ตารางส่วนลดประจำเดือน">
        {[...DISCOUNT_TABLE].reverse().map((row) => {
          const me = row.rate === r.rate;
          const leg = !me && row.rate === legRate;
          return (
            <li
              key={row.rate}
              className={`rounded-md py-1 ${
                me ? "bg-teal-700 text-white" : leg ? "bg-teal-50 ring-2 ring-teal-500" : "bg-white ring-1 ring-stone-200"
              }`}
            >
              <div className="text-sm leading-tight font-bold">{row.rate}%</div>
              <div className={`text-[10px] leading-tight ${me ? "text-teal-50" : "text-stone-600"}`}>
                {fmt0(row.pv)}
              </div>
              <div className={`text-[9px] leading-tight ${me ? "text-teal-100" : "text-stone-400"}`}>
                {fmt0(row.bv)}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-1 text-center text-[11px] text-stone-500">
        ตารางส่วนลด (บน PV / ล่าง BV) · <span className="font-semibold text-teal-800">■ เรา</span>
        {legRate != null && <span className="text-teal-700"> · □ สายงาน</span>}
      </p>
    </div>
  );
}

/** ตารางส่วนลด ด้านข้าง (iPad / คอมพิวเตอร์) */
function RateSide({ r }: { r: NodeResult }) {
  const legRate = r.legs[0]?.rate ?? (r.leaderLegs > 0 ? 21 : null);
  return (
    <div className="sticky top-5 space-y-3">
      <div className="card p-0">
        <h2 className="px-3 pt-3 text-sm font-semibold text-stone-900">ตารางส่วนลดประจำเดือน</h2>
        <table className="mt-2 w-full text-sm">
          <thead className="text-xs text-stone-500">
            <tr>
              <th className="px-3 py-1 text-left font-medium">ยอดกลุ่ม</th>
              <th className="px-3 py-1 text-right font-medium">ส่วนลด</th>
            </tr>
          </thead>
          <tbody>
            {DISCOUNT_TABLE.map((row) => {
              const me = row.rate === r.rate;
              const leg = !me && row.rate === legRate;
              return (
                <tr
                  key={row.rate}
                  className={me ? "bg-teal-700 text-white" : leg ? "bg-teal-50" : "border-t border-stone-100"}
                >
                  <td className="px-3 py-1.5">
                    <div>
                      {fmt0(row.pv)} PV
                      {me && <span className="ml-1 text-xs">← เรา</span>}
                      {leg && <span className="ml-1 text-xs text-teal-700">← สายงาน</span>}
                    </div>
                    <div className={`text-xs ${me ? "text-teal-100" : "text-stone-500"}`}>{fmt0(row.bv)} BV</div>
                  </td>
                  <td className="px-3 py-1.5 text-right font-bold">{row.rate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-3 py-2 text-xs text-stone-500">BV (บาท) = PV × {PV_TO_BV}</p>
      </div>
      {r.groupPv > 0 && (
        <div className="card space-y-2 text-center">
          <div className="text-xs text-stone-500">ยอดกลุ่มของเรา</div>
          <Volume pv={r.groupPv} bv={r.groupBv} className="text-xl font-bold text-stone-900" />
          <NextHint pv={r.groupPv} />
        </div>
      )}
    </div>
  );
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex gap-2 text-sm ${ok ? "text-stone-800" : "text-stone-400"}`}>
      <span aria-hidden>{ok ? "✓" : "○"}</span>
      <span>{children}</span>
    </li>
  );
}

function CorePlusCard({ node }: { node: PlanNode }) {
  const r = evaluate(node);
  const cp = corePlus(node);
  const kids = node.children.map(evaluate);
  const ppv = node.pv >= 1_000;
  const legs3 = kids.filter((k) => k.rate >= 3).length;
  const legs6 = kids.filter((k) => k.rate >= 6).length;

  return (
    <section className="card space-y-4 bg-violet-50 ring-violet-200">
      <header>
        <p className="text-xs font-medium text-violet-700">โปรแกรมคอร์พลัส ปีคุณสมบัติ 2569/70</p>
        <h2 className="font-semibold text-stone-900">รางวัลเพิ่มสำหรับนักธุรกิจรายใหม่</h2>
      </header>

      <CoreItem title="โก-บรอนซ์" amount={cp.goBronze}>
        <Check ok={ppv}>ยอดซื้อส่วนตัวอย่างน้อย 1,000 PV (ตอนนี้ {fmt0(node.pv)} PV)</Check>
        <Check ok={cp.goBronzeLegs >= 2}>
          รายใหม่ติดตัวที่มีกลุ่ม 1,500 PV ขึ้นไป: {cp.goBronzeLegs} รหัส
        </Check>
        <li className="pl-6 text-xs text-stone-500">2 รหัส ได้ ฿1,000 · 3 รหัสขึ้นไป ได้ ฿1,500</li>
      </CoreItem>

      <CoreItem title="บรอนซ์ฟาวน์เดชั่น +20%" amount={cp.foundation}>
        <Check ok={r.rate >= 9}>เราได้ 9% ขึ้นไป (ตอนนี้ {r.rate}%)</Check>
        <Check ok={legs3 >= 3}>มี 3 สายที่ได้ 3% ขึ้นไป (ตอนนี้ {legs3} สาย)</Check>
        <Check ok={ppv}>ยอดซื้อส่วนตัวอย่างน้อย 1,000 PV</Check>
        <li className="pl-6 text-xs text-stone-500">20% ของส่วนลดประจำเดือน (฿{fmt(cp.base)})</li>
      </CoreItem>

      <CoreItem title="บรอนซ์บิวเดอร์ +30%" amount={cp.builder}>
        <Check ok={r.rate >= 15}>เราได้ 15% ขึ้นไป (ตอนนี้ {r.rate}%)</Check>
        <Check ok={legs6 >= 3}>มี 3 สายที่ได้ 6% ขึ้นไป (ตอนนี้ {legs6} สาย)</Check>
        <Check ok={ppv}>ยอดซื้อส่วนตัวอย่างน้อย 1,000 PV</Check>
        <li className="pl-6 text-xs text-stone-500">
          30% ของส่วนลดประจำเดือน (฿{fmt(cp.base)}) · ได้พร้อมบรอนซ์ฟาวน์เดชั่น และเข็มบรอนซ์
        </li>
      </CoreItem>

      {cp.newSilver > 0 && (
        <p className="rounded-lg bg-white px-3 py-2 text-sm text-stone-700">
          เดือนแรกที่ได้ 21% (เข็มเงินครั้งแรก) รับเงินรางวัล ฿10,000 ครั้งเดียว
        </p>
      )}
      <div className="flex items-baseline justify-between border-t border-violet-200 pt-2">
        <span className="font-semibold text-stone-900">คอร์พลัสต่อเดือน</span>
        <span className="text-xl font-bold text-violet-800">฿{fmt(corePlusMonthly(cp))}</span>
      </div>
      <p className="text-xs text-stone-500">
        ฟาวน์เดชั่น/บิวเดอร์ จ่ายสูงสุด 12 ครั้ง ภายใน 2–3 ปีคุณสมบัติ · สมมติว่าทุกคนเป็นนักธุรกิจรายใหม่
      </p>
    </section>
  );
}

function CoreItem({ title, amount, children }: { title: string; amount: number; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className={`font-medium ${amount > 0 ? "text-stone-900" : "text-stone-500"}`}>{title}</span>
        <span className={`font-semibold ${amount > 0 ? "text-violet-800" : "text-stone-400"}`}>฿{fmt(amount)}</span>
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function Summary({ r, node, onRestart }: { r: NodeResult; node: PlanNode; onRestart: () => void }) {
  const cp = corePlus(node);
  const plan = planIncome(r);
  const extra = corePlusMonthly(cp);
  return (
    <>
      <Title kicker="สรุป" title="รายได้ตามแผนธุรกิจ" text="ถ้ายอดของทุกคนเป็นแบบนี้ในเดือนนั้น" />
      <Result r={r} node={node} />
      <CorePlusCard node={node} />
      <section className="card space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-stone-700">แผนหลัก + คอร์พลัส ต่อเดือน</span>
          <span className="text-2xl font-bold text-stone-900">฿{fmt0(plan + extra)}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-stone-700">ถ้าเท่านี้ทุกเดือน ต่อปี</span>
          <span className="text-2xl font-bold text-teal-800">฿{fmt0((plan + extra) * 12)}</span>
        </div>
        <p className="text-xs text-stone-500">
          บรอนซ์ฟาวน์เดชั่น/บิวเดอร์ จ่ายสูงสุด 12 ครั้ง · ยังไม่รวมเงินรางวัลเข็มเงิน/เข็มทองครั้งแรก
          และเออร์ลี่ คิว บูสเตอร์
        </p>
      </section>
      <Disclaimer />
      <button type="button" className="btn-secondary w-full" onClick={onRestart}>
        เริ่มใหม่
      </button>
    </>
  );
}

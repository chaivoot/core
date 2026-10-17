"use client";

import { useMemo, useState } from "react";
import {
  DISCOUNT_TABLE,
  LEADER_RATE,
  PV_TO_BV,
  RETAIL_PROFIT,
  basketPerMonth,
  corePlus,
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

  const go = (n: number) => {
    setStep(Math.min(Math.max(n, 0), LAST));
    window.scrollTo({ top: 0 });
  };
  const setLevel = (i: number, v: number) => setLevels((l) => l.map((x, j) => (j === i ? v : x)));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pt-5 pb-28">
      <Progress step={step} onGo={go} />

      <div className="mt-5 flex-1 space-y-4">
        {step === 0 && <Intro />}

        {step === 1 && (
          <ProductStep
            products={products}
            qty={qty}
            setQty={setQty}
            basket={basket}
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
            <Diagram r={result} levels={levels.slice(0, 1)} />
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
            <Diagram r={result} levels={levels.slice(0, 2)} />
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
            <Diagram r={result} levels={levels} />
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

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2">
          <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => go(step - 1)}>
            ย้อน
          </button>
          <div className="min-w-0 flex-1 text-center">
            {step >= 2 && (
              <>
                <div className="text-xs text-stone-500">ประมาณต่อเดือน</div>
                <div className="text-lg leading-tight font-bold text-teal-800">฿{fmt0(income)}</div>
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
  basket,
  manual,
  setManual,
}: {
  products: PlanProduct[];
  qty: Record<string, number>;
  setQty: (f: (q: Record<string, number>) => Record<string, number>) => void;
  basket: ReturnType<typeof basketPerMonth>;
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
          <div className="mt-1 text-stone-600">{fmt0(MANUAL_BV / PV_TO_BV)} PV ต่อเดือน</div>
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

      <div className="sticky top-0 z-10 -mx-4 bg-stone-50/95 px-4 py-2 backdrop-blur">
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
            <div className="text-xl font-bold text-stone-900">{fmt0(basket.pv)} PV</div>
          </div>
        </div>
      </div>

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
                      ฿{fmt(p.price)} ใช้ได้ {p.days} วัน · {fmt(p.pv)} PV
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
          <div className="text-xl font-bold text-stone-900">{fmt0(r.groupPv)} PV</div>
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
        <div className="text-2xl font-bold text-stone-900">{fmt0(r.groupPv)} PV</div>
        <div className="mt-2">
          <NextHint pv={r.groupPv} />
        </div>
      </div>
    </>
  );
}

/** แผนภาพวงกลม: เราอยู่กลาง สายงานรอบตัว */
function Diagram({ r, levels }: { r: NodeResult; levels: number[] }) {
  const n = levels[0] ?? 0;
  if (n === 0) return null;
  const size = 300;
  const c = size / 2;
  const ring = 105;
  const perLeg = levels.slice(1).reduce((acc, k, i) => acc + levels.slice(1, i + 2).reduce((m, x) => m * x, 1), 0);
  const leg = r.legs[0];
  const legRate = leg?.rate ?? 21;
  const legPv = leg?.groupPv ?? r.groupPv;

  return (
    <figure className="card">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-sm" role="img" aria-label="ผังสายงาน">
        {Array.from({ length: n }, (_, i) => {
          const a = (2 * Math.PI * i) / n - Math.PI / 2;
          const x = c + ring * Math.cos(a);
          const y = c + ring * Math.sin(a);
          return (
            <g key={i}>
              <line x1={c} y1={c} x2={x} y2={y} className="stroke-stone-300" strokeWidth={2} />
              <circle cx={x} cy={y} r={30} className="fill-teal-50 stroke-teal-600" strokeWidth={2} />
              <text x={x} y={y - 2} textAnchor="middle" className="fill-teal-900 text-[13px] font-semibold">
                {legRate}%
              </text>
              {perLeg > 0 && (
                <text x={x} y={y + 13} textAnchor="middle" className="fill-stone-500 text-[10px]">
                  +{perLeg} คน
                </text>
              )}
            </g>
          );
        })}
        <circle cx={c} cy={c} r={44} className="fill-teal-700" />
        <text x={c} y={c - 4} textAnchor="middle" className="fill-white text-[14px] font-semibold">
          เรา
        </text>
        <text x={c} y={c + 16} textAnchor="middle" className="fill-white text-[15px] font-bold">
          {r.rate}%
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-stone-600">
        {n} สาย · แต่ละสาย {fmt0(legPv)} PV ({1 + perLeg} รหัส)
      </figcaption>
    </figure>
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
    <section className="card space-y-3 bg-violet-50 ring-violet-200">
      <header>
        <p className="text-xs font-medium text-violet-700">โปรแกรมคอร์พลัส ปีคุณสมบัติ 2569/70</p>
        <h2 className="font-semibold text-stone-900">รางวัลเพิ่มสำหรับนักธุรกิจรายใหม่</h2>
      </header>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="font-medium text-stone-800">โก-บรอนซ์</span>
          <span className="font-semibold">฿{fmt(cp.goBronze)}</span>
        </div>
        <ul className="space-y-0.5">
          <Check ok={ppv}>ยอดซื้อส่วนตัวอย่างน้อย 1,000 PV</Check>
          <Check ok={cp.goBronzeLegs >= 2}>
            รายใหม่ที่มีกลุ่ม 1,500 PV ขึ้นไป: {cp.goBronzeLegs} รหัส (2 รหัส ฿1,000 · 3 รหัส ฿1,500)
          </Check>
        </ul>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="font-medium text-stone-800">
            {cp.bronze?.kind === "builder" ? "บรอนซ์บิวเดอร์ (+30%)" : "บรอนซ์ฟาวน์เดชั่น (+20%)"}
          </span>
          <span className="font-semibold">฿{fmt(cp.bronze?.amount ?? 0)}</span>
        </div>
        {cp.bronze?.kind === "builder" ? (
          <ul className="space-y-0.5">
            <Check ok>ได้ 15% ขึ้นไป และมี 3 สายที่ได้ 6% ขึ้นไป ({legs6} สาย)</Check>
            <Check ok>30% ของส่วนลดประจำเดือน (฿{fmt(r.own + r.differential)})</Check>
          </ul>
        ) : (
          <ul className="space-y-0.5">
            <Check ok={r.rate >= 9}>เราได้ 9% ขึ้นไป (ตอนนี้ {r.rate}%)</Check>
            <Check ok={legs3 >= 3}>มีอย่างน้อย 3 สายที่ได้ 3% ขึ้นไป (ตอนนี้ {legs3} สาย)</Check>
            <Check ok={ppv}>ยอดซื้อส่วนตัวอย่างน้อย 1,000 PV</Check>
            <Check ok={!!cp.bronze}>20% ของส่วนลดประจำเดือน (฿{fmt(r.own + r.differential)})</Check>
          </ul>
        )}
        {cp.bronze?.kind !== "builder" && (
          <p className="text-xs text-stone-500">
            ถ้าได้ 15% และมี 3 สายที่ได้ 6% ขึ้นไป จะเป็นบรอนซ์บิวเดอร์ +30% แทน
          </p>
        )}
      </div>

      {cp.newSilver > 0 && (
        <p className="rounded-lg bg-white px-3 py-2 text-sm text-stone-700">
          เดือนแรกที่ได้ 21% (เข็มเงินครั้งแรก) รับเงินรางวัล ฿10,000 ครั้งเดียว
        </p>
      )}
      <div className="flex items-baseline justify-between border-t border-violet-200 pt-2">
        <span className="font-semibold text-stone-900">คอร์พลัสต่อเดือน</span>
        <span className="text-xl font-bold text-violet-800">
          ฿{fmt(cp.goBronze + (cp.bronze?.amount ?? 0))}
        </span>
      </div>
    </section>
  );
}

function Summary({ r, node, onRestart }: { r: NodeResult; node: PlanNode; onRestart: () => void }) {
  const cp = corePlus(node);
  const plan = planIncome(r);
  const extra = cp.goBronze + (cp.bronze?.amount ?? 0);
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

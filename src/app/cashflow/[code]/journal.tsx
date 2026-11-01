"use client";

import { useState } from "react";
import { money, roiText, unitOf } from "@/lib/cashflow/data";
import type { JournalEntry } from "@/lib/cashflow/engine";

const sign = (n: number) => `${n >= 0 ? "+" : "−"}${money(Math.abs(n))}`;

/** บรรทัดลงงบ: ซ้าย = รายการ, ขวา = จำนวน (สีเขียวเข้า / แดงออก) */
function Line({ label, value, tone, note }: { label: string; value: string; tone?: "in" | "out"; note?: string }) {
  return (
    <div className="border-b border-dashed border-amber-300/80 py-1">
      <div className="flex justify-between gap-2">
        <span className="text-stone-700">{label}</span>
        <span className={`font-hand shrink-0 text-lg leading-none ${tone === "in" ? "text-emerald-700" : tone === "out" ? "text-rose-700" : "text-blue-900"}`}>{value}</span>
      </div>
      {note && <p className="text-xs text-stone-500">{note}</p>}
    </div>
  );
}

/**
 * อธิบายการลงงบของรายการซื้อ/ขายล่าสุด ให้คนเล่นใหม่เข้าใจว่าเงินไปไหน
 * ปิดได้ (จำไว้ต่อรายการ) รายการใหม่ขึ้นมาก็แสดงใหม่
 */
export function JournalCard({ entry }: { entry: JournalEntry }) {
  const [closed, setClosed] = useState<number | null>(null);
  if (closed === entry.seq) return null;
  const e = entry;
  const unit = e.stock ? unitOf(e.stock) : "";

  return (
    <div className="card space-y-2 bg-amber-50/70 ring-amber-200">
      <div className="flex items-center justify-between">
        <p className="font-semibold">📒 ลงงบการเงิน</p>
        <button className="text-sm text-stone-400" onClick={() => setClosed(e.seq)} aria-label="ปิด">
          ✕
        </button>
      </div>

      {e.kind === "buyStock" && (
        <>
          <p className="text-sm text-stone-600">ซื้อ{e.name} — เงินสดเปลี่ยนเป็นหุ้น</p>
          <Line label="เงินสด (ทรัพย์สิน)" value={sign(e.cash)} tone="out" />
          <Line
            label={`${e.name} (ทรัพย์สิน)`}
            value={`+${e.qty!.toLocaleString("th-TH")} ${unit}`}
            tone="in"
            note={`ราคา ${money(e.price!)}/${unit} × ${e.qty!.toLocaleString("th-TH")} = ${money(e.qty! * e.price!)}`}
          />
          <p className="text-sm text-stone-700">
            ตอนนี้ถือ <b>{e.holdQty!.toLocaleString("th-TH")} {unit}</b> ต้นทุนเฉลี่ย <b>{money(Math.round(e.avgCost!))}/{unit}</b>
          </p>
          <p className="text-xs text-stone-500">หุ้นไม่ได้เพิ่มรายได้ทุกเดือน ได้กำไรเมื่อขายได้ราคาสูงกว่าต้นทุนเฉลี่ย</p>
        </>
      )}

      {e.kind === "sellStock" && (
        <>
          <p className="text-sm text-stone-600">ขาย{e.name} — หุ้นเปลี่ยนกลับเป็นเงินสด</p>
          <Line label={`${e.name}`} value={`−${e.qty!.toLocaleString("th-TH")} ${unit}`} tone="out" note={`ต้นทุนของส่วนที่ขาย ${money(e.soldCost!)}`} />
          <Line label="เงินสด" value={sign(e.cash)} tone="in" note={`ราคาขาย ${money(e.price!)}/${unit} × ${e.qty!.toLocaleString("th-TH")}`} />
          <p className={`text-sm font-medium ${e.cash - e.soldCost! >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {e.cash - e.soldCost! >= 0 ? "กำไร" : "ขาดทุน"} {money(Math.abs(e.cash - e.soldCost!))}
          </p>
          {e.holdQty! > 0 && (
            <p className="text-sm text-stone-600">
              เหลือ {e.holdQty!.toLocaleString("th-TH")} {unit} ต้นทุนเฉลี่ยเท่าเดิม {money(Math.round(e.avgCost!))}/{unit}
            </p>
          )}
        </>
      )}

      {e.kind === "buyAsset" && (
        <>
          <p className="text-sm text-stone-600">ซื้อ{e.name} ราคาเต็ม {money(e.full!)}</p>
          <Line label="เงินดาวน์ (จ่ายจากเงินสด)" value={sign(-e.down!)} tone="out" />
          {e.fee ? <Line label="ค่านายหน้ารับสิทธิ์" value={sign(-e.fee)} tone="out" /> : null}
          {e.mortgage! > 0 ? (
            <Line
              label="จำนองธนาคาร (หนี้สิน)"
              value={money(e.mortgage!)}
              note={`ราคาเต็ม ${money(e.full!)} − ดาวน์ ${money(e.down!)} = ส่วนที่กู้ธนาคาร ต้องผ่อนทุกเดือน`}
            />
          ) : (
            <p className="text-sm text-stone-600">จ่ายสดทั้งก้อน ไม่มีหนี้กับธนาคาร</p>
          )}
          <Line
            label="กระแสเงินสด/เดือน (รายรับ)"
            value={sign(e.cashflow!)}
            tone={e.cashflow! >= 0 ? "in" : "out"}
            note={e.mortgage! > 0 ? "ค่าเช่า/รายได้ที่เหลือ หลังหักค่าผ่อนจำนองแล้ว" : "รายได้ที่เข้ามาทุกเดือน"}
          />
          {e.cashflow! > 0 && <p className="text-sm text-emerald-700">✓ ทรัพย์สินจ่ายเงินให้คุณทุกเดือน — เพิ่มใน &quot;รายได้จากทรัพย์สิน&quot;</p>}
          {e.cashflow! < 0 && (
            <p className="text-sm text-rose-700">⚠ ค่าเช่าไม่พอผ่อนธนาคาร ต้องควักเงินเดือนจ่ายเพิ่ม {money(-e.cashflow!)} ทุกเดือน — ทรัพย์สินนี้ดึงเงินออกจากกระเป๋า</p>
          )}
          {e.cashflow === 0 && <p className="text-sm text-stone-600">ไม่มีเงินเข้าทุกเดือน ได้ประโยชน์เมื่อขายได้ราคาดี</p>}
          <p className="text-xs text-stone-500">📊 {roiText(e.down!, e.cashflow!)}</p>
        </>
      )}

      {e.kind === "sellAsset" && (
        <>
          <p className="text-sm text-stone-600">ขาย{e.name}</p>
          <Line label="ราคาขาย" value={money(e.gross!)} />
          {e.mortgage! > 0 && <Line label="ปิดจำนองธนาคาร (หนี้สินหายไป)" value={sign(-e.mortgage!)} tone="out" />}
          <Line label="เงินสดเข้ากระเป๋า" value={sign(e.cash)} tone="in" />
          <p className={`text-sm font-medium ${e.cash - e.down! >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            เทียบกับเงินดาวน์ที่จ่ายไป {money(e.down!)}: {e.cash - e.down! >= 0 ? "กำไร" : "ขาดทุน"} {money(Math.abs(e.cash - e.down!))}
          </p>
          {e.cashflow !== 0 && (
            <p className="text-xs text-stone-500">
              รายได้จากทรัพย์สินนี้ {sign(e.cashflow!)}/เดือน หายไปด้วย — เงินก้อนนี้ควรไปซื้อทรัพย์สินที่ให้กระแสเงินสดมากกว่าเดิม
            </p>
          )}
        </>
      )}
    </div>
  );
}

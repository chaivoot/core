import { addContactAction } from "@/app/(app)/contacts/actions";
import { SubmitButton } from "@/components/submit-button";
import { ToggleChip } from "@/components/toggle-chip";

/** เพิ่มรายชื่อให้เร็วที่สุด: พิมพ์ชื่ออย่างเดียวก็บันทึกได้ */
export function QuickAddContact() {
  return (
    <form action={addContactAction} className="card space-y-3">
      <label htmlFor="quick-name" className="label">
        เพิ่มรายชื่อ
      </label>
      <div className="flex gap-2">
        <input
          id="quick-name"
          name="name"
          required
          maxLength={200}
          autoComplete="off"
          placeholder="พิมพ์ชื่อ แล้วกดเพิ่ม"
          className="input"
        />
        <SubmitButton className="btn-primary shrink-0" pendingText="…">
          เพิ่ม
        </SubmitButton>
      </div>
      <details className="group">
        <summary className="cursor-pointer text-sm text-stone-500 select-none">
          ใส่รายละเอียดเพิ่ม (ไม่บังคับ)
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="label" htmlFor="quick-channel">ช่องทางติดต่อ</label>
            <input id="quick-channel" name="channel" maxLength={300} className="input" placeholder="เช่น LINE, เบอร์โทร" />
          </div>
          <div>
            <span className="label">ความสนใจตอนนี้</span>
            <div className="flex flex-wrap gap-2">
              <ToggleChip type="radio" name="interest" value="" defaultChecked>
                ยังไม่ระบุ
              </ToggleChip>
              <ToggleChip type="radio" name="interest" value="product">
                สินค้า
              </ToggleChip>
              <ToggleChip type="radio" name="interest" value="business">
                ธุรกิจ
              </ToggleChip>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="quick-note">โน้ต</label>
            <textarea id="quick-note" name="note" rows={2} maxLength={5000} className="input" />
          </div>
        </div>
      </details>
    </form>
  );
}

"use client";

import { useState } from "react";

const MAX_SIDE = 800;

/** ย่อรูปในเบราว์เซอร์ (รูปจากกล้องมือถือใหญ่หลาย MB) ให้เป็น JPEG ด้านยาวไม่เกิน 800px */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  // พื้นขาว: PNG โปร่งใสแปลงเป็น JPEG แล้วจะได้ไม่เป็นพื้นดำ
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  return blob ? new File([blob], "product.jpg", { type: "image/jpeg" }) : file;
}

export function ImageInput({ current }: { current: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-2">
      <span className="label">รูปสินค้า</span>
      <div className="flex items-center gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-stone-200">
          {preview || current ? (
            // eslint-disable-next-line @next/next/no-img-element -- รูปจาก blob/route ของเราเอง ไม่ต้องผ่าน next/image
            <img src={preview ?? current ?? ""} alt="" className="size-full object-contain" />
          ) : (
            <span className="text-xs text-stone-400">ไม่มีรูป</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-teal-800"
            onChange={async (e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              if (!file) return setPreview(null);
              setBusy(true);
              try {
                const small = await shrink(file);
                const dt = new DataTransfer();
                dt.items.add(small);
                input.files = dt.files;
                setPreview(URL.createObjectURL(small));
              } catch {
                setPreview(URL.createObjectURL(file));
              } finally {
                setBusy(false);
              }
            }}
          />
          {busy && <p className="text-xs text-stone-500">กำลังย่อรูป…</p>}
          {current && !preview && (
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" name="removeImage" className="size-4" />
              ลบรูปนี้
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

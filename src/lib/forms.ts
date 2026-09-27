import { z } from "zod";

/** ข้อความว่าง -> null, ตัดช่องว่าง, จำกัดความยาว */
export const optionalText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((v) => {
      const t = v?.trim() ?? "";
      return t === "" ? null : t.slice(0, max);
    });

export const checkbox = z
  .string()
  .nullish()
  .transform((v) => v === "on");

export function formObject(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

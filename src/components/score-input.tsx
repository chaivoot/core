/** เลือกคะแนนจำนวนเต็ม 0-10 (radio ธรรมดา ใช้ได้โดยไม่ต้องมี JS) */
export function ScoreInput({
  name = "score",
  defaultValue,
  disabled,
}: {
  name?: string;
  defaultValue: number | null;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">คะแนน 0 ถึง 10</legend>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
        {Array.from({ length: 11 }, (_, n) => (
          <label key={n} className="relative">
            <input
              type="radio"
              name={name}
              value={n}
              defaultChecked={defaultValue === n}
              required
              className="peer sr-only"
            />
            <span className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-stone-300 bg-white text-lg font-semibold text-stone-700 peer-checked:border-teal-700 peer-checked:bg-teal-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600/40 peer-disabled:cursor-default">
              {n}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

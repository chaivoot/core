/** ปุ่มกดเลือก (checkbox/radio) หน้าตาเป็นชิป */
export function ToggleChip({
  type = "checkbox",
  name,
  value = "on",
  defaultChecked,
  required,
  children,
}: {
  type?: "checkbox" | "radio";
  name: string;
  value?: string;
  defaultChecked?: boolean;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="inline-flex">
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        required={required}
        className="peer sr-only"
      />
      <span className="chip">{children}</span>
    </label>
  );
}

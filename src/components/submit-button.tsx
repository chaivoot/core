"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingText = "กำลังบันทึก…",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || props.disabled} {...props}>
      {pending ? pendingText : children}
    </button>
  );
}

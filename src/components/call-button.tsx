/** ปุ่มโทรหาเจ้าของระบบ (ไม่แสดงเบอร์บนหน้าจอ) */
export function CallButton({ className = "btn-secondary w-full" }: { className?: string }) {
  return (
    <a href="tel:0819496389" className={className}>
      โทรหาเรา
    </a>
  );
}

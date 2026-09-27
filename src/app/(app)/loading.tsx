// แสดงทันทีระหว่างรอข้อมูล ให้รู้สึกว่ากดแล้วตอบสนอง
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="กำลังโหลด">
      <div className="h-7 w-40 rounded-lg bg-stone-200" />
      <div className="h-24 rounded-2xl bg-stone-200/70" />
      <div className="h-24 rounded-2xl bg-stone-200/70" />
      <div className="h-40 rounded-2xl bg-stone-200/70" />
    </div>
  );
}

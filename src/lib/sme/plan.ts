// จำลองแผนเริ่มธุรกิจของตัวเอง: ต้องมีเงินเท่าไหร่ เก็บกี่ปีถึงจะพอ และโอกาสรอดของธุรกิจใหม่
// ฟังก์ชันล้วน (คำนวณในเบราว์เซอร์ ไม่ได้เก็บข้อมูลของผู้ใช้)

export type CostItem = {
  label: string;
  amount: number;
  /** rent = ค่าเช่ารายเดือน · deposit = เงินมัดจำค่าเช่า (หายไปถ้ามีที่/ตึกของตัวเอง) */
  tag?: "rent" | "deposit";
};

export type Template = {
  id: string;
  name: string;
  icon: string;
  setup: CostItem[];
  monthly: CostItem[];
  /** กำไรขั้นต้น (% ของยอดขาย หลังหักต้นทุนสินค้า/วัตถุดิบ) */
  margin: number;
  note?: string;
};

// ตัวเลขตั้งต้นเป็นค่าประมาณของธุรกิจขนาดเล็กในไทย (บาท) ไว้เป็นจุดเริ่มคิด ผู้ใช้ปรับเองได้ทุกช่อง
export const TEMPLATES: Template[] = [
  {
    id: "cafe",
    name: "ร้านกาแฟ (สร้างแบรนด์เอง)",
    icon: "☕",
    margin: 65,
    setup: [
      { label: "ตกแต่งร้าน", amount: 400_000 },
      { label: "เครื่องชงและอุปกรณ์", amount: 250_000 },
      { label: "มัดจำค่าเช่า 3 เดือน", amount: 75_000, tag: "deposit" },
      { label: "ใบอนุญาต / จดทะเบียน", amount: 10_000 },
      { label: "วัตถุดิบเริ่มต้น", amount: 30_000 },
      { label: "การตลาดช่วงเปิดร้าน", amount: 30_000 },
    ],
    monthly: [
      { label: "ค่าเช่า", amount: 25_000, tag: "rent" },
      { label: "พนักงาน 2 คน", amount: 30_000 },
      { label: "ค่าน้ำ ค่าไฟ", amount: 8_000 },
      { label: "การตลาดและอื่น ๆ", amount: 7_000 },
    ],
  },
  {
    id: "food",
    name: "ร้านอาหาร (สร้างแบรนด์เอง)",
    icon: "🍜",
    margin: 55,
    setup: [
      { label: "ตกแต่งร้าน", amount: 300_000 },
      { label: "ครัวและอุปกรณ์", amount: 200_000 },
      { label: "มัดจำค่าเช่า 3 เดือน", amount: 60_000, tag: "deposit" },
      { label: "ใบอนุญาต / จดทะเบียน", amount: 10_000 },
      { label: "วัตถุดิบเริ่มต้น", amount: 30_000 },
      { label: "การตลาดช่วงเปิดร้าน", amount: 20_000 },
    ],
    monthly: [
      { label: "ค่าเช่า", amount: 20_000, tag: "rent" },
      { label: "พนักงาน 3 คน", amount: 36_000 },
      { label: "ค่าน้ำ ค่าไฟ ค่าแก๊ส", amount: 12_000 },
      { label: "การตลาดและอื่น ๆ", amount: 7_000 },
    ],
  },
  {
    id: "cafe-franchise",
    name: "ร้านกาแฟ (แฟรนไชส์)",
    icon: "🥤",
    margin: 55,
    note: "ได้แบรนด์และระบบสำเร็จรูป แลกกับค่าแฟรนไชส์และค่าธรรมเนียมรายเดือน",
    setup: [
      { label: "ค่าแฟรนไชส์", amount: 150_000 },
      { label: "บูธ / ตกแต่ง", amount: 100_000 },
      { label: "เครื่องชงและอุปกรณ์", amount: 100_000 },
      { label: "มัดจำค่าเช่า 3 เดือน", amount: 30_000, tag: "deposit" },
      { label: "วัตถุดิบเริ่มต้น", amount: 20_000 },
    ],
    monthly: [
      { label: "ค่าเช่า", amount: 10_000, tag: "rent" },
      { label: "พนักงาน 1 คน", amount: 12_000 },
      { label: "ค่าธรรมเนียมแฟรนไชส์", amount: 3_000 },
      { label: "ค่าน้ำ ค่าไฟ", amount: 4_000 },
    ],
  },
  {
    id: "pharmacy",
    name: "ร้านขายยา",
    icon: "💊",
    margin: 25,
    note: "ต้องมีเภสัชกรประจำร้านตามกฎหมาย และสต็อกยาก้อนใหญ่",
    setup: [
      { label: "ตกแต่งร้าน / ตู้ยา", amount: 300_000 },
      { label: "สต็อกยาและเวชภัณฑ์ล็อตแรก", amount: 500_000 },
      { label: "ระบบขาย / คอมพิวเตอร์", amount: 50_000 },
      { label: "มัดจำค่าเช่า 3 เดือน", amount: 60_000, tag: "deposit" },
      { label: "ใบอนุญาตขายยา / จดทะเบียน", amount: 10_000 },
    ],
    monthly: [
      { label: "ค่าเช่า", amount: 20_000, tag: "rent" },
      { label: "เภสัชกรประจำร้าน", amount: 35_000 },
      { label: "ผู้ช่วย 1 คน", amount: 13_000 },
      { label: "ค่าน้ำ ค่าไฟ และอื่น ๆ", amount: 7_000 },
    ],
  },
  {
    id: "minimart",
    name: "ร้านสะดวกซื้อ / มินิมาร์ทชุมชน",
    icon: "🛒",
    margin: 20,
    note: "กำไรต่อชิ้นต่ำ ต้องอาศัยยอดขายสูงและหมุนสต็อกเร็ว",
    setup: [
      { label: "ชั้นวาง / ตกแต่งร้าน", amount: 300_000 },
      { label: "สินค้าล็อตแรก", amount: 600_000 },
      { label: "ตู้แช่ / ระบบขาย", amount: 200_000 },
      { label: "มัดจำค่าเช่า 3 เดือน", amount: 60_000, tag: "deposit" },
      { label: "ใบอนุญาต / จดทะเบียน", amount: 10_000 },
    ],
    monthly: [
      { label: "ค่าเช่า", amount: 20_000, tag: "rent" },
      { label: "พนักงาน 2 คน", amount: 26_000 },
      { label: "ค่าไฟ (ตู้แช่)", amount: 15_000 },
      { label: "อื่น ๆ", amount: 5_000 },
    ],
  },
  {
    id: "petshop",
    name: "ร้านอาหารสัตว์ (อุปกรณ์สัตว์เลี้ยง)",
    icon: "🐶",
    margin: 25,
    note: "สต็อกอาหารสัตว์ก้อนใหญ่ กำไรต่อชิ้นไม่สูง ลูกค้าประจำซื้อซ้ำทุกเดือน",
    setup: [
      { label: "ชั้นวาง / ตกแต่งร้าน", amount: 200_000 },
      { label: "สต็อกอาหารและอุปกรณ์ล็อตแรก", amount: 300_000 },
      { label: "ระบบขาย / คอมพิวเตอร์", amount: 30_000 },
      { label: "มัดจำค่าเช่า 3 เดือน", amount: 45_000, tag: "deposit" },
      { label: "ใบอนุญาต / จดทะเบียน", amount: 5_000 },
      { label: "การตลาดช่วงเปิดร้าน", amount: 20_000 },
    ],
    monthly: [
      { label: "ค่าเช่า", amount: 15_000, tag: "rent" },
      { label: "พนักงาน 1 คน", amount: 13_000 },
      { label: "ค่าน้ำ ค่าไฟ", amount: 5_000 },
      { label: "ค่าส่ง / อื่น ๆ", amount: 5_000 },
    ],
  },
  {
    id: "accounting",
    name: "สำนักงานบัญชี",
    icon: "🧾",
    margin: 85,
    note: "ธุรกิจบริการ ต้นทุนหลักคือคน รายได้มาจากลูกค้ารายเดือน",
    setup: [
      { label: "ตกแต่งสำนักงาน", amount: 150_000 },
      { label: "คอมพิวเตอร์ / โปรแกรมบัญชี", amount: 100_000 },
      { label: "มัดจำค่าเช่า 3 เดือน", amount: 36_000, tag: "deposit" },
      { label: "จดทะเบียน / ใบอนุญาตวิชาชีพ", amount: 10_000 },
      { label: "การตลาด / หาลูกค้าช่วงแรก", amount: 20_000 },
    ],
    monthly: [
      { label: "ค่าเช่า", amount: 12_000, tag: "rent" },
      { label: "พนักงานบัญชี 2 คน", amount: 36_000 },
      { label: "ค่าโปรแกรม / อินเทอร์เน็ต", amount: 3_000 },
      { label: "ค่าน้ำ ค่าไฟ และอื่น ๆ", amount: 4_000 },
    ],
  },
  {
    id: "salon",
    name: "ร้านเสริมสวย / ซาลอน",
    icon: "💇",
    margin: 70,
    setup: [
      { label: "ตกแต่งร้าน", amount: 250_000 },
      { label: "เก้าอี้และอุปกรณ์", amount: 150_000 },
      { label: "มัดจำค่าเช่า 3 เดือน", amount: 45_000, tag: "deposit" },
      { label: "ใบอนุญาต / จดทะเบียน", amount: 5_000 },
      { label: "ผลิตภัณฑ์เริ่มต้น", amount: 30_000 },
      { label: "การตลาดช่วงเปิดร้าน", amount: 20_000 },
    ],
    monthly: [
      { label: "ค่าเช่า", amount: 15_000, tag: "rent" },
      { label: "ช่าง / ผู้ช่วย", amount: 25_000 },
      { label: "ค่าน้ำ ค่าไฟ", amount: 6_000 },
      { label: "การตลาดและอื่น ๆ", amount: 5_000 },
    ],
  },
  {
    id: "online",
    name: "ร้านค้าออนไลน์",
    icon: "📦",
    margin: 40,
    note: "ไม่มีหน้าร้าน แต่ต้องใช้เงินกับสต็อกและโฆษณา",
    setup: [
      { label: "สต็อกสินค้าล็อตแรก", amount: 150_000 },
      { label: "คอมพิวเตอร์ / อุปกรณ์ถ่ายรูป", amount: 50_000 },
      { label: "ทำแบรนด์ / เว็บไซต์", amount: 30_000 },
      { label: "โฆษณาช่วงเปิดตัว", amount: 50_000 },
    ],
    monthly: [
      { label: "ค่าโฆษณา", amount: 15_000 },
      { label: "ผู้ช่วยแพ็กของ", amount: 12_000 },
      { label: "ค่าแพลตฟอร์ม / ค่าส่ง", amount: 5_000 },
      { label: "อื่น ๆ", amount: 3_000 },
    ],
  },
  {
    id: "laundry",
    name: "ร้านสะดวกซัก (หยอดเหรียญ)",
    icon: "🧺",
    margin: 75,
    setup: [
      { label: "เครื่องซัก-อบ", amount: 900_000 },
      { label: "ตกแต่งร้าน / ระบบน้ำไฟ", amount: 150_000 },
      { label: "มัดจำค่าเช่า 3 เดือน", amount: 30_000, tag: "deposit" },
      { label: "ใบอนุญาต / จดทะเบียน", amount: 5_000 },
      { label: "การตลาดช่วงเปิดร้าน", amount: 15_000 },
    ],
    monthly: [
      { label: "ค่าเช่า", amount: 10_000, tag: "rent" },
      { label: "ค่าน้ำ ค่าไฟ", amount: 15_000 },
      { label: "ซ่อมบำรุง / ทำความสะอาด", amount: 5_000 },
    ],
  },
  {
    id: "franchise",
    name: "ร้านอาหาร (แฟรนไชส์)",
    icon: "🏪",
    margin: 50,
    setup: [
      { label: "ค่าแฟรนไชส์", amount: 300_000 },
      { label: "ตกแต่ง / บูธ", amount: 200_000 },
      { label: "อุปกรณ์", amount: 150_000 },
      { label: "มัดจำค่าเช่า 3 เดือน", amount: 45_000, tag: "deposit" },
      { label: "วัตถุดิบเริ่มต้น", amount: 30_000 },
    ],
    monthly: [
      { label: "ค่าเช่า", amount: 15_000, tag: "rent" },
      { label: "พนักงาน 2 คน", amount: 24_000 },
      { label: "ค่าธรรมเนียมแฟรนไชส์", amount: 5_000 },
      { label: "ค่าน้ำ ค่าไฟ", amount: 6_000 },
    ],
  },
  {
    id: "custom",
    name: "ธุรกิจอื่น (กรอกเอง)",
    icon: "✏️",
    margin: 50,
    setup: [
      { label: "ค่าตกแต่ง / ปรับปรุงสถานที่", amount: 200_000 },
      { label: "อุปกรณ์", amount: 100_000 },
      { label: "มัดจำค่าเช่า", amount: 30_000, tag: "deposit" },
      { label: "อื่น ๆ", amount: 20_000 },
    ],
    monthly: [
      { label: "ค่าเช่า", amount: 10_000, tag: "rent" },
      { label: "พนักงาน", amount: 15_000 },
      { label: "ค่าน้ำ ค่าไฟ และอื่น ๆ", amount: 5_000 },
    ],
  },
];

export type PlanInput = {
  setup: CostItem[];
  monthly: CostItem[];
  margin: number;
  /** มีที่ดิน/ตึกของตัวเอง → ไม่มีค่าเช่าและเงินมัดจำ */
  ownSpace: boolean;
  /** ค่าใช้จ่ายส่วนตัวต่อเดือนช่วงที่ธุรกิจยังไม่มีกำไร */
  ownerPay: number;
  /** เงินหมุนเวียนสำรองกี่เดือน */
  runwayMonths: number;
  /** พ่อแม่/ครอบครัวช่วย (บาท ตอนเริ่ม) */
  family: number;
  /** กู้ธนาคาร/สินเชื่อ (บาท ตอนเริ่ม) */
  loan: number;
  savingsNow: number;
  savePerMonth: number;
  /** เก็บเงินได้เพิ่มขึ้นปีละกี่ % (เงินเดือนขึ้น) */
  saveGrowth: number;
  /** ผลตอบแทนเงินเก็บต่อปี (%) */
  returnRate: number;
  /** ค่าใช้จ่ายเปิดธุรกิจแพงขึ้นปีละกี่ % (เงินเฟ้อ) */
  inflation: number;
  /** อยากเริ่มในอีกกี่ปี */
  targetYears: number;
};

/**
 * เงินเฟ้อที่คิดให้อัตโนมัติ (%/ปี) — ค่าเปิดร้านแพงขึ้นทุกปี
 * กรอบเป้าหมายเงินเฟ้อของ ธปท. คือ 1–3% ใช้ขอบบน 3% เพราะค่าก่อสร้าง ค่าเช่า ค่าแรง มักขึ้นเร็วกว่าเฉลี่ย
 */
export const AUTO_INFLATION = 3;

const sum = (xs: CostItem[]) => xs.reduce((s, x) => s + (Number.isFinite(x.amount) ? x.amount : 0), 0);

/** รายการที่ใช้จริง (มีที่ของตัวเอง ไม่มีค่าเช่า/มัดจำ) */
export function effectiveItems(p: Pick<PlanInput, "setup" | "monthly" | "ownSpace">) {
  const keep = (x: CostItem) => !(p.ownSpace && (x.tag === "rent" || x.tag === "deposit"));
  return { setup: p.setup.filter(keep), monthly: p.monthly.filter(keep) };
}

export type PlanResult = {
  setupTotal: number;
  monthlyBusiness: number;
  /** ค่าใช้จ่ายต่อเดือนช่วงตั้งตัว (ธุรกิจ + ตัวเอง) */
  monthlyBurn: number;
  runwayTotal: number;
  /** เงินที่ต้องมีทั้งหมด (คิดด้วยราคาวันนี้) */
  needToday: number;
  /** ส่วนที่ต้องเก็บเอง (หักเงินครอบครัว/เงินกู้แล้ว) ราคาวันนี้ */
  ownNeedToday: number;
  /** ตอนถึงปีเป้าหมาย */
  needAtTarget: number;
  savedAtTarget: number;
  /** พร้อมกี่ % ตอนถึงปีเป้าหมาย */
  readyPct: number;
  /** เก็บได้พอในกี่ปี (null = 40 ปีก็ยังไม่พอ) */
  yearsToReady: number | null;
  /** ต้องเก็บเดือนละเท่าไหร่ถึงจะทันเป้า */
  savePerMonthNeeded: number;
  /** ยอดขายที่ต้องทำได้ต่อเดือนถึงจะคุ้มทุน (รวมเงินเดือนตัวเอง) */
  breakEvenSales: number;
  /** สัดส่วนเงินกู้ในเงินลงทุนทั้งหมด (%) */
  loanShare: number;
  /** กราฟ: ทุกสิ้นปี เงินเก็บ vs เงินที่ต้องมี */
  series: { year: number; saved: number; need: number }[];
};

const MAX_YEARS = 40;

/** เงินเก็บสะสมรายเดือน (ทบต้น, เก็บเพิ่มทุกต้นปี) */
function simulate(p: PlanInput, perMonth: number, months: number) {
  const r = p.returnRate / 100 / 12;
  let bal = p.savingsNow;
  const out = [bal];
  for (let m = 1; m <= months; m++) {
    const year = Math.floor((m - 1) / 12);
    bal = bal * (1 + r) + perMonth * Math.pow(1 + p.saveGrowth / 100, year);
    out.push(bal);
  }
  return out;
}

export function plan(p: PlanInput): PlanResult {
  const items = effectiveItems(p);
  const setupTotal = sum(items.setup);
  const monthlyBusiness = sum(items.monthly);
  const monthlyBurn = monthlyBusiness + p.ownerPay;
  const runwayTotal = monthlyBurn * p.runwayMonths;
  const needToday = setupTotal + runwayTotal;
  const external = p.family + p.loan;
  const ownNeedToday = Math.max(0, needToday - external);

  // ราคาเปิดธุรกิจแพงขึ้นตามเงินเฟ้อ ส่วนเงินครอบครัว/เงินกู้ใช้ตามจำนวนที่กรอก
  const needAt = (months: number) => Math.max(0, needToday * Math.pow(1 + p.inflation / 100, months / 12) - external);

  const months = MAX_YEARS * 12;
  const bal = simulate(p, p.savePerMonth, months);
  let readyMonth: number | null = null;
  for (let m = 0; m <= months; m++) {
    if (bal[m] >= needAt(m)) {
      readyMonth = m;
      break;
    }
  }

  const T = Math.round(p.targetYears * 12);
  const needAtTarget = needAt(T);
  const savedAtTarget = bal[T];
  const readyPct = needAtTarget <= 0 ? 100 : Math.min(100, (savedAtTarget / needAtTarget) * 100);

  // หาเงินเก็บต่อเดือนที่ทำให้ทันเป้าพอดี
  let lo = 0;
  let hi = Math.max(needAtTarget, 1);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (simulate(p, mid, T)[T] >= needAtTarget) hi = mid;
    else lo = mid;
  }

  const breakEvenSales = p.margin > 0 ? monthlyBurn / (p.margin / 100) : Infinity;
  const invest = needToday;
  const series = Array.from({ length: Math.min(MAX_YEARS, Math.max(p.targetYears, readyMonth !== null ? Math.ceil(readyMonth / 12) : p.targetYears) + 3) + 1 }, (_, y) => ({
    year: y,
    saved: bal[y * 12],
    need: needAt(y * 12),
  }));

  return {
    setupTotal,
    monthlyBusiness,
    monthlyBurn,
    runwayTotal,
    needToday,
    ownNeedToday,
    needAtTarget,
    savedAtTarget,
    readyPct,
    yearsToReady: readyMonth === null ? null : readyMonth / 12,
    savePerMonthNeeded: needAtTarget <= p.savingsNow ? 0 : hi,
    breakEvenSales,
    loanShare: invest > 0 ? Math.min(100, (p.loan / invest) * 100) : 0,
    series,
  };
}

/**
 * สัดส่วนธุรกิจที่ยังเปิดอยู่หลังเปิดกิจการ (ประมาณ)
 * อ้างอิงสถิติกลุ่มสถานประกอบการเกิดใหม่ของสหรัฐ (BLS Business Employment Dynamics):
 * รอดปีแรก ~80% · ราวครึ่งหนึ่งรอดถึงปีที่ 5 · กลุ่มที่เปิดปี 2013 เหลือ 34.7% ในปี 2023
 * (ไทยยังไม่มีชุดข้อมูลสาธารณะที่ติดตามเป็นรายปีแบบเดียวกัน)
 */
export const SURVIVAL: { year: number; pct: number }[] = [
  { year: 1, pct: 80 },
  { year: 2, pct: 70 },
  { year: 3, pct: 62 },
  { year: 5, pct: 50 },
  { year: 10, pct: 35 },
];

export type ReadinessKey = "experience" | "tested" | "customers" | "runway" | "debt" | "breakeven";

/** ปัจจัยที่ช่วยให้ธุรกิจใหม่รอด (บางข้อคำนวณจากแผน บางข้อผู้ใช้ติ๊กเอง) */
export function readiness(r: PlanResult, p: PlanInput, checks: Partial<Record<ReadinessKey, boolean>>) {
  const perDay = r.breakEvenSales / 26;
  return [
    { key: "runway" as const, ok: p.runwayMonths >= 6, label: `มีเงินหมุนเวียนสำรอง ${p.runwayMonths} เดือน`, hint: "อย่างน้อย 6 เดือน (ดีมาก 12 เดือน) — SME ไทยส่วนใหญ่มีสายป่านไม่ถึง 6 เดือน" },
    { key: "debt" as const, ok: r.loanShare <= 50, label: `เงินกู้ ${Math.round(r.loanShare)}% ของเงินลงทุน`, hint: "ไม่ควรเกินครึ่ง ยิ่งกู้มาก ค่าผ่อนยิ่งกดดันช่วงที่ยังไม่มีกำไร" },
    {
      key: "breakeven" as const,
      ok: !!checks.breakeven,
      label: `มั่นใจว่าขายได้วันละ ${Math.round(perDay).toLocaleString("th-TH")} บาท`,
      hint: "ยอดขายที่ต้องทำได้เพื่อคุ้มทุน (รวมเงินเดือนตัวเอง) ลองนับลูกค้าจริงในทำเลนั้นก่อน",
    },
    { key: "experience" as const, ok: !!checks.experience, label: "เคยทำงานในธุรกิจแบบนี้มาก่อน", hint: "รู้ต้นทุน รู้ลูกค้า รู้ปัญหาหน้างาน ก่อนลงเงินเอง" },
    { key: "tested" as const, ok: !!checks.tested, label: "ทดลองขายจริงแบบเล็ก ๆ มาแล้ว", hint: "เช่น ขายออนไลน์ ออกบูธ ทำเป็นงานเสริม ก่อนเปิดร้านเต็มตัว" },
    { key: "customers" as const, ok: !!checks.customers, label: "มีกลุ่มลูกค้า/ช่องทางขายชัดเจน", hint: "รู้ว่าใครจะซื้อ ซื้อเพราะอะไร และจะหาลูกค้าใหม่จากไหน" },
  ];
}

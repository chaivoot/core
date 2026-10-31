// ข้อมูลเกม "กระแสเงินสด" ตาม docs/cashflow-game.md (อาชีพ กระดาน การ์ด)

export const COLORS = [
  { id: "red", label: "แดง", hex: "#e11d48" },
  { id: "orange", label: "ส้ม", hex: "#ea580c" },
  { id: "yellow", label: "เหลือง", hex: "#ca8a04" },
  { id: "green", label: "เขียว", hex: "#16a34a" },
  { id: "blue", label: "น้ำเงิน", hex: "#2563eb" },
  { id: "purple", label: "ม่วง", hex: "#9333ea" },
] as const;
export type ColorId = (typeof COLORS)[number]["id"];
export const MAX_PLAYERS = COLORS.length;
export const MIN_PLAYERS = 2;

export const colorHex = (id: string) => COLORS.find((c) => c.id === id)?.hex ?? "#57534e";

export type Profession = {
  name: string;
  salary: number;
  tax: number;
  house: number;
  car: number;
  card: number;
  other: number;
  child: number;
  savings: number;
};

export const PROFESSIONS: Profession[] = [
  { name: "พนักงานขาย", salary: 25_000, tax: 500, house: 5_000, car: 3_000, card: 1_500, other: 8_000, child: 1_500, savings: 10_000 },
  { name: "ครู", salary: 28_000, tax: 1_000, house: 6_000, car: 3_500, card: 1_000, other: 9_000, child: 2_000, savings: 12_000 },
  { name: "พนักงานออฟฟิศ", salary: 30_000, tax: 1_500, house: 7_000, car: 4_000, card: 1_500, other: 9_000, child: 2_000, savings: 15_000 },
  { name: "พยาบาล", salary: 35_000, tax: 2_000, house: 8_000, car: 4_500, card: 1_500, other: 10_000, child: 2_500, savings: 15_000 },
  { name: "ช่างเทคนิค", salary: 32_000, tax: 1_500, house: 7_000, car: 5_000, card: 2_000, other: 9_500, child: 2_000, savings: 12_000 },
  { name: "ผู้จัดการร้าน", salary: 45_000, tax: 3_000, house: 11_000, car: 6_000, card: 2_500, other: 13_500, child: 3_000, savings: 20_000 },
  { name: "วิศวกร", salary: 60_000, tax: 5_000, house: 15_000, car: 8_000, card: 3_000, other: 17_000, child: 4_000, savings: 25_000 },
  { name: "แพทย์", salary: 120_000, tax: 18_000, house: 30_000, car: 15_000, card: 5_000, other: 32_000, child: 7_000, savings: 40_000 },
];

/** หนี้ตั้งต้น = ค่าผ่อน × จำนวนเดือน */
export const DEBT_MONTHS = { house: 120, car: 50, card: 30 } as const;
export type Debt = keyof typeof DEBT_MONTHS;
export const DEBT_LABEL: Record<Debt, string> = { house: "บ้าน", car: "รถ", card: "บัตรเครดิต" };

export const LOAN_UNIT = 10_000;
export const LOAN_PAYMENT = 1_000;
export const MAX_CHILDREN = 3;
export const RESPONSE_SECONDS = 30;

export type Square = "opportunity" | "payday" | "market" | "doodad" | "charity" | "baby" | "downsize";

export const SQUARE_LABEL: Record<Square, string> = {
  opportunity: "โอกาส",
  payday: "เงินเดือน",
  market: "ตลาด",
  doodad: "จ่ายซะ",
  charity: "ทำบุญ",
  baby: "มีลูก",
  downsize: "ตกงาน",
};

/** กระดานสนามแข่งหนู 24 ช่อง (โอกาส 10 เงินเดือน 3 ตลาด 4 จ่าย 4 ทำบุญ 1 มีลูก 1 ตกงาน 1) */
export const BOARD: Square[] = [
  "opportunity", "doodad", "opportunity", "charity", "opportunity", "payday",
  "opportunity", "market", "opportunity", "doodad", "baby", "market",
  "opportunity", "payday", "opportunity", "doodad", "downsize", "opportunity",
  "market", "opportunity", "payday", "doodad", "opportunity", "market",
];

export type StockKind = "pharma" | "ent" | "elec" | "fund" | "gold";
export const STOCKS: StockKind[] = ["pharma", "ent", "elec", "fund", "gold"];
export const STOCK_LABEL: Record<StockKind, string> = {
  pharma: "หุ้นบริษัทยา",
  ent: "หุ้นบริษัทเอนเตอร์เทนเมนต์",
  elec: "หุ้นบริษัทอิเล็กทรอนิกส์",
  fund: "กองทุนรวม",
  gold: "เหรียญทองคำสะสม",
};
/** หุ้น/กองทุนซื้อทีละ 100 เหรียญทองซื้อทีละเหรียญ
 * ราคาหุ้นตั้งให้สัดส่วนเข้ากับเงินเดือนและการ์ดจ่ายซะ: 100 หุ้น ≈ ฿5,000–฿60,000 */
export const lotOf = (k: StockKind) => (k === "gold" ? 1 : 100);
export const unitOf = (k: StockKind) => (k === "gold" ? "เหรียญ" : k === "fund" ? "หน่วย" : "หุ้น");

/** ทรัพย์สินที่ซื้อได้จากการ์ดดีล */
export type AssetDeal = {
  name: string;
  /** ราคาต่อหน่วย × units = ราคาเต็ม */
  price: number;
  down: number;
  mortgage: number;
  cashflow: number;
  /** กลุ่มที่การ์ดตลาดใช้จับคู่ */
  tag: string;
  units?: number;
  /** ให้เช่า (ได้ผลจากการ์ดค่าเช่าขึ้น) */
  rental?: boolean;
};

export type DealCard =
  | { type: "stock"; stock: StockKind; price: number; /** มีขายจำกัด (เช่น เหรียญทอง) */ max?: number; text?: string }
  | { type: "split"; stock: StockKind; factor: number; text: string }
  /** ต้องจ่ายทันที เช่น ญาติขอยืมเงิน (ไม่ได้คืน) */
  | { type: "lend"; text: string; amount: number }
  | ({ type: "asset" } & AssetDeal);

const stock = (s: StockKind, price: number): DealCard => ({ type: "stock", stock: s, price });
const gold = (price: number, max: number, text: string): DealCard => ({ type: "stock", stock: "gold", price, max, text });
const asset = (a: AssetDeal): DealCard => ({ type: "asset", ...a });

export const SMALL_DEALS: DealCard[] = [
  stock("pharma", 50), stock("pharma", 100), stock("pharma", 200), stock("pharma", 300),
  stock("ent", 100), stock("ent", 200), stock("ent", 300), stock("ent", 400),
  stock("elec", 100), stock("elec", 200), stock("elec", 400), stock("elec", 500),
  asset({ name: "คอนโด 1 ห้องนอน ใกล้รถไฟฟ้า", price: 900_000, down: 45_000, mortgage: 855_000, cashflow: 2_000, tag: "condo", rental: true }),
  asset({ name: "คอนโดเก่ารีโนเวต", price: 600_000, down: 30_000, mortgage: 570_000, cashflow: 1_500, tag: "condo", rental: true }),
  asset({ name: "ห้องแถวให้เช่า", price: 750_000, down: 40_000, mortgage: 710_000, cashflow: 1_000, tag: "shophouse", rental: true }),
  asset({ name: "คอนโดขายทอดตลาด", price: 450_000, down: 20_000, mortgage: 430_000, cashflow: 2_500, tag: "condo", rental: true }),
  asset({ name: "ที่ดินเปล่า 1 ไร่ ชานเมือง", price: 50_000, down: 50_000, mortgage: 0, cashflow: 0, tag: "land1" }),
  asset({ name: "ตู้หยอดเหรียญซักผ้า 2 ตู้", price: 30_000, down: 30_000, mortgage: 0, cashflow: 1_200, tag: "laundry" }),
  asset({ name: "ร้านกาแฟรถเข็น (ให้เช่าแฟรนไชส์)", price: 40_000, down: 40_000, mortgage: 0, cashflow: 1_500, tag: "coffee" }),
  asset({ name: "เครื่องขายน้ำอัตโนมัติ", price: 25_000, down: 25_000, mortgage: 0, cashflow: 800, tag: "vending" }),
  asset({ name: "ทาวน์โฮมยึดจากธนาคาร", price: 1_000_000, down: 50_000, mortgage: 950_000, cashflow: -500, tag: "townhouse", rental: true }),
  { type: "split", stock: "pharma", factor: 2, text: "หุ้นบริษัทยาแตกพาร์ ใครถืออยู่ได้จำนวนหุ้น ×2" },
  { type: "split", stock: "ent", factor: 0.5, text: "หุ้นบริษัทเอนเตอร์เทนเมนต์ลดพาร์ ใครถืออยู่จำนวนหุ้น ÷2" },
  asset({ name: "ห้องเช่าหอพัก 4 ห้อง", price: 1_200_000, down: 50_000, mortgage: 1_150_000, cashflow: 3_000, tag: "dorm", rental: true }),
  stock("fund", 100), stock("fund", 200),
  gold(4_000, 10, "คนรู้จักขายเหรียญทองคำสะสม 10 เหรียญ เหรียญละ ฿4,000"),
  gold(6_000, 5, "งานประมูลของสะสม มีเหรียญทองคำ 5 เหรียญ เหรียญละ ฿6,000"),
  gold(3_000, 20, "ทายาทขายเหรียญทองคำของคุณปู่ 20 เหรียญ เหรียญละ ฿3,000"),
  asset({ name: "คอนโด 2 ห้องนอน 1 ห้องน้ำ ใกล้มหาวิทยาลัย", price: 1_000_000, down: 50_000, mortgage: 950_000, cashflow: 1_500, tag: "condo21", rental: true }),
  asset({ name: "คอนโด 2/1 ขายด่วน เจ้าของย้ายงาน", price: 850_000, down: 40_000, mortgage: 810_000, cashflow: 2_200, tag: "condo21", rental: true }),
  asset({ name: "บ้านเดี่ยว 3 ห้องนอน 2 ห้องน้ำ ชานเมือง", price: 1_500_000, down: 50_000, mortgage: 1_450_000, cashflow: 1_000, tag: "house32", rental: true }),
  asset({ name: "บ้าน 3/2 ขายทอดตลาด สภาพต้องซ่อมนิดหน่อย", price: 1_200_000, down: 40_000, mortgage: 1_160_000, cashflow: 2_500, tag: "house32", rental: true }),
  asset({ name: "บ้าน 3/2 ในหมู่บ้านใหม่ (ค่าเช่าน้อยกว่าค่าผ่อน)", price: 1_800_000, down: 50_000, mortgage: 1_750_000, cashflow: -800, tag: "house32", rental: true }),
  { type: "lend", text: "ญาติขอยืมเงิน ฿10,000 ไม่รู้จะได้คืนเมื่อไหร่", amount: 10_000 },
  { type: "lend", text: "เพื่อนสนิทขอยืมเงินไปเปิดร้าน ฿20,000", amount: 20_000 },
];

export const BIG_DEALS: DealCard[] = [
  asset({ name: "อพาร์ตเมนต์ 8 ห้อง", price: 500_000, units: 8, down: 400_000, mortgage: 3_600_000, cashflow: 12_000, tag: "apartment", rental: true }),
  asset({ name: "อพาร์ตเมนต์ 12 ห้อง", price: 500_000, units: 12, down: 600_000, mortgage: 5_400_000, cashflow: 18_000, tag: "apartment", rental: true }),
  asset({ name: "อพาร์ตเมนต์ 24 ห้อง", price: 500_000, units: 24, down: 1_200_000, mortgage: 10_800_000, cashflow: 40_000, tag: "apartment", rental: true }),
  asset({ name: "บ้านเดี่ยวให้เช่า 2 หลัง", price: 1_500_000, units: 2, down: 300_000, mortgage: 2_700_000, cashflow: 6_000, tag: "house", rental: true }),
  asset({ name: "บ้านเดี่ยวให้เช่า 3 หลัง", price: 1_500_000, units: 3, down: 450_000, mortgage: 4_050_000, cashflow: 10_000, tag: "house", rental: true }),
  asset({ name: "ตึกแถว 3 คูหา ปล่อยเช่า", price: 5_000_000, down: 500_000, mortgage: 4_500_000, cashflow: 15_000, tag: "shoprow", rental: true }),
  asset({ name: "มินิมาร์ท (มีผู้จัดการแล้ว)", price: 1_500_000, down: 300_000, mortgage: 1_200_000, cashflow: 10_000, tag: "minimart" }),
  asset({ name: "ร้านซ่อมมือถือ 2 สาขา", price: 800_000, down: 200_000, mortgage: 600_000, cashflow: 7_000, tag: "phoneshop" }),
  asset({ name: "คาร์แคร์", price: 2_000_000, down: 400_000, mortgage: 1_600_000, cashflow: 14_000, tag: "carcare" }),
  asset({ name: "โกดังให้เช่า", price: 7_000_000, down: 1_000_000, mortgage: 6_000_000, cashflow: 25_000, tag: "warehouse", rental: true }),
  asset({ name: "อาคารสำนักงานเล็ก", price: 10_000_000, down: 1_500_000, mortgage: 8_500_000, cashflow: 35_000, tag: "office", rental: true }),
  asset({ name: "รีสอร์ตเล็ก 10 หลัง", price: 8_000_000, down: 1_200_000, mortgage: 6_800_000, cashflow: 22_000, tag: "resort" }),
  asset({ name: "ห้องเช่าใกล้มหาวิทยาลัย 20 ห้อง", price: 9_000_000, down: 900_000, mortgage: 8_100_000, cashflow: 30_000, tag: "uniroom", rental: true }),
  asset({ name: "ที่ดินติดถนนใหญ่ 5 ไร่", price: 2_500_000, down: 250_000, mortgage: 2_250_000, cashflow: -5_000, tag: "land5" }),
  asset({ name: "ปั๊มน้ำมันเล็ก", price: 6_000_000, down: 1_000_000, mortgage: 5_000_000, cashflow: 20_000, tag: "gas" }),
  asset({ name: "ร้านอาหาร (ต้องจ้างคนดูแล)", price: 3_000_000, down: 600_000, mortgage: 2_400_000, cashflow: 9_000, tag: "restaurant" }),
  asset({ name: "บ้านแฝด 2 หลัง ปล่อยเช่า", price: 1_400_000, units: 2, down: 280_000, mortgage: 2_520_000, cashflow: 7_000, tag: "duplex", rental: true }),
  asset({ name: "ตึก 4 ห้องเช่า", price: 600_000, units: 4, down: 240_000, mortgage: 2_160_000, cashflow: 9_000, tag: "apartment", rental: true }),
];

export const DOODADS: { text: string; amount: number }[] = [
  { text: "เปลี่ยนมือถือรุ่นใหม่", amount: 35_000 },
  { text: "กินบุฟเฟต์โรงแรมกับเพื่อน", amount: 3_000 },
  { text: "เที่ยวต่างประเทศ", amount: 40_000 },
  { text: "ซื้อทีวีจอใหญ่", amount: 25_000 },
  { text: "ซ่อมรถ", amount: 8_000 },
  { text: "งานแต่งเพื่อน (ใส่ซอง + ชุดใหม่)", amount: 5_000 },
  { text: "ซื้อนาฬิกาแบรนด์เนม", amount: 50_000 },
  { text: "สมัครฟิตเนสรายปี", amount: 15_000 },
  { text: "ค่าหมอฟัน", amount: 6_000 },
  { text: "ซื้อเกมคอนโซล", amount: 18_000 },
  { text: "ช้อปออนไลน์ช่วงลดราคา", amount: 7_000 },
  { text: "ซื้อจักรยานราคาแพง", amount: 30_000 },
  { text: "ปาร์ตี้วันเกิด", amount: 10_000 },
  { text: "ค่าเทอมคอร์สออนไลน์ที่ไม่ได้เรียน", amount: 9_000 },
  { text: "ซื้อกล้องถ่ายรูป", amount: 28_000 },
  { text: "ค่าซ่อมบ้าน (หลังคารั่ว)", amount: 12_000 },
];

export type MarketCard =
  | { type: "sellAsset"; text: string; tag: string; price: number; perUnit?: boolean }
  | { type: "sellStock"; text: string; stock: StockKind; price: number }
  | { type: "rentUp"; text: string; amount: number }
  | { type: "expense"; text: string; tags: string[]; amount: number };

export const MARKETS: MarketCard[] = [
  { type: "sellAsset", text: "คู่แต่งงานใหม่อยากได้คอนโดใกล้รถไฟฟ้า ให้ราคา ฿1,300,000", tag: "condo", price: 1_300_000 },
  { type: "sellAsset", text: "นักลงทุนกวาดซื้อคอนโดไว้ปล่อยเช่า ให้ราคา ฿1,000,000", tag: "condo", price: 1_000_000 },
  { type: "sellAsset", text: "ห้างใหม่จะมาเปิดใกล้ ๆ มีคนขอซื้อที่ดินเปล่า 1 ไร่ ฿300,000", tag: "land1", price: 300_000 },
  { type: "sellAsset", text: "บริษัทอสังหาฯ จะทำหมู่บ้าน ขอซื้อที่ดิน 5 ไร่ ฿6,000,000", tag: "land5", price: 6_000_000 },
  { type: "sellAsset", text: "ร้านสะดวกซื้ออยากได้ทำเลห้องแถว ให้ราคา ฿1,100,000", tag: "shophouse", price: 1_100_000 },
  { type: "sellAsset", text: "นักลงทุนขอซื้ออพาร์ตเมนต์ทั้งตึก ให้ราคาห้องละ ฿600,000", tag: "apartment", price: 600_000, perUnit: true },
  { type: "sellAsset", text: "บริษัทย้ายพนักงานมาประจำ ขอซื้อบ้านเช่าหลังละ ฿2,000,000", tag: "house", price: 2_000_000, perUnit: true },
  { type: "sellAsset", text: "บริษัทขนส่งขยายสาขา ขอซื้อโกดัง ฿10,000,000", tag: "warehouse", price: 10_000_000 },
  { type: "sellAsset", text: "เครือร้านสะดวกซื้อขอซื้อมินิมาร์ท ฿3,000,000", tag: "minimart", price: 3_000_000 },
  { type: "rentUp", text: "นิคมอุตสาหกรรมเปิดใหม่ คนย้ายเข้าเยอะ ค่าเช่าขึ้น ทรัพย์สินให้เช่าทุกชิ้น +฿500/เดือน", amount: 500 },
  { type: "expense", text: "ผู้เช่าหนีค่าเช่า ห้องพังต้องซ่อม เจ้าของคอนโด/ห้องแถวจ่าย ฿20,000", tags: ["condo", "condo21", "shophouse"], amount: 20_000 },
  { type: "expense", text: "กฎหมายใหม่ ร้านซ่อมมือถือต้องอัปเกรดเครื่องมือ จ่าย ฿50,000", tags: ["phoneshop"], amount: 50_000 },
  { type: "sellStock", text: "บริษัทอิเล็กทรอนิกส์ได้สัญญาส่งชิปให้ค่ายรถยนต์ หุ้นพุ่งไป ฿700", stock: "elec", price: 700 },
  { type: "sellStock", text: "บริษัทยาผ่านการทดลองยาตัวใหม่ หุ้นขึ้นไป ฿450", stock: "pharma", price: 450 },
  { type: "sellStock", text: "บริษัทเอนเตอร์เทนเมนต์โดนฟ้องหนัก หุ้นร่วงเหลือ ฿20", stock: "ent", price: 20 },
  { type: "sellAsset", text: "รีสอร์ตได้รางวัลท่องเที่ยว เครือโรงแรมขอซื้อ ฿12,000,000", tag: "resort", price: 12_000_000 },
  { type: "sellStock", text: "ตลาดหุ้นขาขึ้น กองทุนรวมขายได้หน่วยละ ฿300", stock: "fund", price: 300 },
  { type: "sellAsset", text: "ครอบครัวลูกสองย้ายเข้าเมือง ต้องการบ้าน 3/2 ให้ราคา ฿2,000,000", tag: "house32", price: 2_000_000 },
  { type: "sellAsset", text: "มีคนขอซื้อบ้าน 3/2 ราคา ฿1,700,000", tag: "house32", price: 1_700_000 },
  { type: "sellAsset", text: "หมู่บ้านใหม่ขายหมด คนแย่งซื้อบ้าน 3/2 มือสอง ให้ราคา ฿2,300,000", tag: "house32", price: 2_300_000 },
  { type: "sellAsset", text: "อาจารย์มหาวิทยาลัยต้องการคอนโด 2/1 ให้ราคา ฿1,300,000", tag: "condo21", price: 1_300_000 },
  { type: "sellAsset", text: "มีคนขอซื้อคอนโด 2/1 ราคา ฿1,100,000", tag: "condo21", price: 1_100_000 },
  { type: "sellStock", text: "ราคาทองขึ้น นักสะสมรับซื้อเหรียญทองคำ เหรียญละ ฿8,000", stock: "gold", price: 8_000 },
  { type: "sellStock", text: "ร้านทองรับซื้อเหรียญทองคำ เหรียญละ ฿5,000", stock: "gold", price: 5_000 },
  { type: "sellAsset", text: "ครอบครัวใหญ่อยากอยู่ใกล้กัน ขอซื้อบ้านแฝดหลังละ ฿1,900,000", tag: "duplex", price: 1_900_000, perUnit: true },
  { type: "expense", text: "ฝนตกหนัก น้ำท่วมหมู่บ้าน เจ้าของบ้านให้เช่าจ่ายค่าซ่อม ฿15,000", tags: ["house32", "house", "duplex", "townhouse"], amount: 15_000 },
  { type: "sellStock", text: "บริษัทอิเล็กทรอนิกส์ขาดทุนติดกันสามไตรมาส หุ้นร่วงเหลือ ฿50", stock: "elec", price: 50 },
];

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
export const baht = (n: number) => `${n < 0 ? "−" : ""}฿${thb.format(Math.abs(Math.round(n)))}`;

// ---------- ทางด่วน (วงนอก) ----------

/** เข้าทางด่วนแล้วได้รายได้ต่อรอบ = รายได้จากทรัพย์สิน × ตัวคูณนี้ */
export const FAST_MULTIPLIER = 20;
/** ชนะเมื่อรายได้ต่อรอบเพิ่มขึ้นจากตอนเข้าทางด่วนเท่านี้ หรือซื้อความฝันของตัวเองได้ */
export const FAST_GOAL = 500_000;

export type FastBusiness = { name: string; short: string; cost: number; cashflow: number };

export const FAST_BUSINESSES: FastBusiness[] = [
  { name: "โรงแรมบูทีค", short: "โรงแรมบูทีค", cost: 6_000_000, cashflow: 150_000 },
  { name: "ห้างสรรพสินค้าขนาดเล็ก", short: "ห้างเล็ก", cost: 10_000_000, cashflow: 260_000 },
  { name: "โรงงานน้ำดื่ม", short: "โรงงานน้ำดื่ม", cost: 3_000_000, cashflow: 80_000 },
  { name: "แฟรนไชส์กาแฟ 10 สาขา", short: "กาแฟ 10 สาขา", cost: 2_000_000, cashflow: 55_000 },
  { name: "โรงเรียนกวดวิชา", short: "กวดวิชา", cost: 1_500_000, cashflow: 40_000 },
  { name: "คลินิกทันตกรรม", short: "คลินิกฟัน", cost: 4_000_000, cashflow: 100_000 },
  { name: "สวนทุเรียน 50 ไร่", short: "สวนทุเรียน", cost: 5_000_000, cashflow: 120_000 },
  { name: "ปั๊มน้ำมัน 3 แห่ง", short: "ปั๊ม 3 แห่ง", cost: 8_000_000, cashflow: 200_000 },
  { name: "คอนโดทั้งตึก", short: "คอนโดทั้งตึก", cost: 12_000_000, cashflow: 320_000 },
  { name: "บริษัทขนส่ง", short: "ขนส่ง", cost: 7_000_000, cashflow: 170_000 },
  { name: "โรงพิมพ์", short: "โรงพิมพ์", cost: 2_500_000, cashflow: 60_000 },
  { name: "ศูนย์การค้าชุมชน", short: "คอมมูนิตี้มอลล์", cost: 9_000_000, cashflow: 230_000 },
  { name: "รีสอร์ตริมทะเล", short: "รีสอร์ตทะเล", cost: 11_000_000, cashflow: 280_000 },
  { name: "โรงงานอาหารแช่แข็ง", short: "อาหารแช่แข็ง", cost: 6_500_000, cashflow: 160_000 },
  { name: "แอปจองคิวร้านค้า", short: "แอปจองคิว", cost: 1_000_000, cashflow: 30_000 },
  { name: "เครือร้านอาหาร 5 สาขา", short: "ร้านอาหาร 5 สาขา", cost: 4_500_000, cashflow: 110_000 },
];

export type Dream = { name: string; short: string; icon: string; cost: number };

export const DREAMS: Dream[] = [
  { name: "เที่ยวรอบโลก 1 ปี", short: "รอบโลก", icon: "🌍", cost: 3_000_000 },
  { name: "บ้านพักริมทะเล", short: "บ้านริมทะเล", icon: "🏖️", cost: 8_000_000 },
  { name: "ตั้งมูลนิธิช่วยเด็ก", short: "มูลนิธิ", icon: "🤝", cost: 5_000_000 },
  { name: "สร้างโรงเรียนในชนบท", short: "โรงเรียน", icon: "🏫", cost: 4_000_000 },
  { name: "เรือยอชต์ส่วนตัว", short: "เรือยอชต์", icon: "🛥️", cost: 10_000_000 },
  { name: "ฟาร์มออร์แกนิกของครอบครัว", short: "ฟาร์ม", icon: "🌱", cost: 6_000_000 },
  { name: "ส่งลูกเรียนต่างประเทศ", short: "ลูกเรียนนอก", icon: "🎓", cost: 3_500_000 },
  { name: "สตูดิโอศิลปะของตัวเอง", short: "สตูดิโอ", icon: "🎨", cost: 2_500_000 },
];

export type FastEvent =
  | { text: string; short: string; kind: "cash"; pct: number }
  | { text: string; short: string; kind: "loseBiz" }
  | { text: string; short: string; kind: "skip"; turns: number };

export const FAST_EVENTS: FastEvent[] = [
  { text: "ภาษีย้อนหลัง จ่าย 30% ของเงินสด", short: "ภาษีย้อนหลัง", kind: "cash", pct: 0.3 },
  { text: "หุ้นส่วนโกง เสียเงินสดครึ่งหนึ่ง", short: "หุ้นส่วนโกง", kind: "cash", pct: 0.5 },
  { text: "โกดังไฟไหม้ เสียธุรกิจที่ทำรายได้น้อยที่สุด", short: "ไฟไหม้", kind: "loseBiz" },
  { text: "ทำงานหนักจนป่วย ต้องพักรักษา หยุด 2 ตา", short: "ป่วยหนัก", kind: "skip", turns: 2 },
];

export type FastSquare =
  | { type: "payday" }
  | { type: "biz"; index: number }
  | { type: "dream"; index: number }
  | { type: "event"; index: number };

/** ทางด่วน 32 ช่อง เดินรอบสี่เหลี่ยม: มุมทั้ง 4 = วันรับเงิน แต่ละด้าน ธุรกิจ 4 ความฝัน 2 เหตุการณ์ 1 */
export const FAST_BOARD: FastSquare[] = (() => {
  const out: FastSquare[] = [];
  let biz = 0;
  let dream = 0;
  for (let side = 0; side < 4; side++) {
    out.push({ type: "payday" });
    for (const t of ["biz", "dream", "biz", "event", "biz", "dream", "biz"] as const) {
      if (t === "biz") out.push({ type: "biz", index: biz++ });
      else if (t === "dream") out.push({ type: "dream", index: dream++ });
      else out.push({ type: "event", index: side });
    }
  }
  return out;
})();

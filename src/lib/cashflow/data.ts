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
  { name: "พนักงานขาย", salary: 75_000, tax: 12_000, house: 15_000, car: 3_000, card: 1_800, other: 24_000, child: 4_200, savings: 18_000 },
  { name: "ครู", salary: 96_000, tax: 18_000, house: 15_000, car: 3_000, card: 2_700, other: 27_000, child: 5_400, savings: 12_000 },
  { name: "พนักงานออฟฟิศ", salary: 90_000, tax: 16_500, house: 13_500, car: 3_300, card: 2_100, other: 27_000, child: 4_800, savings: 21_000 },
  { name: "พยาบาล", salary: 108_000, tax: 19_500, house: 18_000, car: 3_600, card: 3_000, other: 30_000, child: 6_000, savings: 15_000 },
  { name: "ช่างเทคนิค", salary: 102_000, tax: 18_000, house: 16_500, car: 3_600, card: 2_400, other: 28_500, child: 5_700, savings: 18_000 },
  { name: "ผู้จัดการร้าน", salary: 144_000, tax: 28_500, house: 24_000, car: 4_500, card: 3_600, other: 39_000, child: 7_800, savings: 27_000 },
  { name: "วิศวกร", salary: 195_000, tax: 42_000, house: 33_000, car: 6_000, card: 4_500, other: 51_000, child: 10_200, savings: 45_000 },
  { name: "แพทย์", salary: 360_000, tax: 90_000, house: 60_000, car: 9_000, card: 7_500, other: 90_000, child: 18_000, savings: 105_000 },
];

/** หนี้ตั้งต้น = ค่าผ่อน × จำนวนเดือน */
export const DEBT_MONTHS = { house: 120, car: 50, card: 30 } as const;
export type Debt = keyof typeof DEBT_MONTHS;
export const DEBT_LABEL: Record<Debt, string> = { house: "บ้าน", car: "รถ", card: "บัตรเครดิต" };

export const LOAN_UNIT = 30_000;
export const LOAN_PAYMENT = 3_000;
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
/** หุ้น/กองทุนซื้อทีละ 10 เหรียญทองซื้อทีละเหรียญ
 * หุ้นราคา ฿30–฿1,200 ซื้อทีละ 10 หุ้น */
export const lotOf = (k: StockKind) => (k === "gold" ? 1 : 10);
export const unitOf = (k: StockKind) => (k === "gold" ? "เหรียญ" : k === "fund" ? "หน่วย" : "หุ้น");

/** ทรัพย์สินที่ซื้อได้จากการ์ดดีล */
export type AssetDeal = {
  name: string;
  /** สถานการณ์บนการ์ด เช่น "เจ้าของย้ายงาน ขายด่วน" */
  situation?: string;
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
  | {
      type: "stock";
      stock: StockKind;
      price: number;
      /** มีขายจำกัด (เช่น เหรียญทอง) */
      max?: number;
      /** ข้อความเต็มของการ์ด (ใช้แทนชื่อ+ราคา) */
      text?: string;
      /** หัวข่าวสั้น ๆ ว่าทำไมราคาเป็นแบบนี้ */
      news?: string;
    }
  | { type: "split"; stock: StockKind; factor: number; text: string }
  /** ต้องจ่ายทันที เช่น ญาติขอยืมเงิน (ไม่ได้คืน) */
  | { type: "lend"; text: string; amount: number }
  | ({ type: "asset" } & AssetDeal);

const gold = (price: number, max: number, text: string): DealCard => ({ type: "stock", stock: "gold", price, max, text });
const news = (s: StockKind, price: number, n: string): DealCard => ({ type: "stock", stock: s, price, news: n });
const asset = (a: AssetDeal): DealCard => ({ type: "asset", ...a });
/** อสังหาฯ ผ่อน: ราคาเต็ม − ดาวน์ = จำนอง */
const home = (name: string, situation: string, price: number, down: number, cashflow: number, tag: string): DealCard =>
  asset({ name, situation, price, down, mortgage: price - down, cashflow, tag, rental: true });
/** จ่ายสดทั้งก้อน */
const cashBuy = (name: string, situation: string, cost: number, cashflow: number, tag: string): DealCard =>
  asset({ name, situation, price: cost, down: cost, mortgage: 0, cashflow, tag });
/** อาคาร/ธุรกิจหลายหน่วย: ราคาเต็มหารเท่า ๆ กันต่อหน่วย */
const multi = (name: string, situation: string, price: number, units: number, down: number, cashflow: number, tag: string, rental = true): DealCard =>
  asset({ name, situation, price: price / units, units, down, mortgage: price - down, cashflow, tag, rental });

// หน่วยเงินเป็นบาท = สเปก USD × 30 · ดีลเล็กใช้เงินไม่เกิน ฿150,000 · หุ้นซื้อได้ทีละ 10 หุ้น
export const SMALL_DEALS: DealCard[] = [
  news("elec", 30, "ขาดทุนหนัก ผู้บริหารลาออก"),
  news("elec", 150, "ชิปขาดตลาด ส่งของไม่ทัน"),
  news("elec", 300, "ยอดขายทรงตัว"),
  news("elec", 300, "เปิดโรงงานใหม่"),
  news("elec", 600, "มือถือรุ่นใหม่ขายดี"),
  news("elec", 900, "ได้สัญญาส่งชิปให้ค่ายรถยนต์"),
  news("pharma", 150, "ยาหลักถูกเรียกคืน"),
  news("pharma", 300, "ผลประกอบการทรงตัว"),
  news("pharma", 600, "ขยายโรงงาน"),
  news("pharma", 600, "ได้สัญญาส่งยาให้โรงพยาบาลรัฐ"),
  news("pharma", 900, "ยาใหม่ผ่านการทดลองขั้นแรก"),
  news("pharma", 1_200, "ยาใหม่ได้รับอนุมัติ"),
  news("ent", 150, "หนังฟอร์มใหญ่ขาดทุนยับ"),
  news("ent", 300, "ยอดผู้ชมแพลตฟอร์มลดลง"),
  news("ent", 450, "ผลประกอบการตามคาด"),
  news("ent", 600, "เซ็นสัญญาศิลปินดัง"),
  news("ent", 900, "ซีรีส์ดังไปทั่วเอเชีย"),
  news("fund", 300, "ตลาดหุ้นทั่วโลกตก"),
  news("fund", 600, "ตลาดหุ้นแกว่งตัว"),
  news("fund", 900, "ตลาดหุ้นฟื้นตัว"),
  news("fund", 1_200, "ตลาดหุ้นขาขึ้นทั้งปี"),
  cashBuy("หุ้นกู้บริษัทใหญ่", "ดอกเบี้ยคงที่ จ่ายทุกเดือน", 36_000, 600, "cd"),
  cashBuy("เงินฝากประจำ 3 ปี", "ธนาคารจัดโปรดอกเบี้ยพิเศษ", 72_000, 1_200, "cd"),
  gold(9_000, 10, "คนรู้จักขายเหรียญทองคำสะสม 10 เหรียญ เหรียญละ ฿9,000"),
  gold(12_000, 5, "งานประมูลของสะสม มีเหรียญทองคำ 5 เหรียญ เหรียญละ ฿12,000"),
  gold(15_000, 3, "ทายาทขายเหรียญทองคำของคุณปู่ 3 เหรียญ เหรียญละ ฿15,000"),
  home("บ้าน 2/1", "เจ้าของเกษียณ ย้ายไปอยู่กับลูก (ไม่ต้องดาวน์)", 1_200_000, 0, 3_000, "house21"),
  home("บ้าน 2/1", "ผู้เช่าเดิมอยู่ต่อ สัญญา 1 ปี", 1_350_000, 30_000, 4_800, "house21"),
  home("บ้าน 2/1", "ใกล้โรงเรียน มีครอบครัวรอเช่า", 1_500_000, 60_000, 6_600, "house21"),
  home("บ้าน 3/2", "หมู่บ้านชานเมือง เจ้าของย้ายงาน", 1_500_000, 60_000, 4_500, "house32"),
  home("บ้าน 3/2", "ใกล้นิคมอุตสาหกรรม คนงานเช่าตลอด", 1_650_000, 90_000, 6_600, "house32"),
  home("บ้าน 3/2", "ทำเลดี ติดถนนใหญ่", 1_950_000, 120_000, 9_000, "house32"),
  home("บ้าน 3/2", "หมู่บ้านใหม่ ผู้เช่ายังน้อย ค่าเช่าไม่พอผ่อน", 1_800_000, 90_000, -3_000, "house32"),
  home("คอนโด 2/1", "ใกล้มหาวิทยาลัย", 1_050_000, 30_000, 1_500, "condo21"),
  home("คอนโด 2/1", "เจ้าของย้ายต่างประเทศ ขายด่วน", 1_200_000, 60_000, 3_600, "condo21"),
  home("คอนโด 2/1", "ใกล้รถไฟฟ้า ห้องตกแต่งครบ", 1_350_000, 90_000, 4_800, "condo21"),
  cashBuy("ที่ดินเปล่า 10 ไร่", "ชานเมือง ยังไม่มีความเจริญ", 60_000, 0, "land"),
  cashBuy("ที่ดินเปล่า 20 ไร่", "เจ้าของต้องการเงินด่วน", 150_000, 0, "land"),
  home("บ้านหลุดจำนอง", "ธนาคารยึดมาขาย ต้องซ่อมเอง", 960_000, 60_000, 3_000, "house32"),
  home("บ้านต้องรีโนเวต", "สภาพทรุดโทรม ซื้อถูก", 840_000, 60_000, 3_000, "house21"),
  cashBuy("ตู้หยอดเหรียญ", "ตั้งหน้าหอพัก", 15_000, 1_500, "vending"),
  cashBuy("ตู้ซักผ้าหยอดเหรียญ", "ในหมู่บ้านใหญ่", 30_000, 3_600, "laundry"),
  cashBuy("ร้านกาแฟเล็กสุดสัปดาห์", "จ้างคนช่วยขาย", 45_000, 6_000, "coffee"),
];

// ดีลใหญ่: เงินดาวน์ ฿600,000 ขึ้นไป
export const BIG_DEALS: DealCard[] = [
  multi("อพาร์ตเมนต์ 8 ห้อง", "เจ้าของอายุมากอยากเกษียณ", 4_800_000, 8, 960_000, 48_000, "apartment"),
  multi("อพาร์ตเมนต์ 8 ห้อง", "ห้องเต็ม ใกล้โรงงาน", 4_500_000, 8, 900_000, 45_000, "apartment"),
  multi("อพาร์ตเมนต์ 12 ห้อง", "ผู้เช่าเดิมครบ", 6_000_000, 12, 1_200_000, 60_000, "apartment"),
  multi("อพาร์ตเมนต์ 12 ห้อง", "ใกล้มหาวิทยาลัย", 7_500_000, 12, 1_500_000, 72_000, "apartment"),
  multi("อพาร์ตเมนต์ 24 ห้อง", "ใกล้รถไฟฟ้าสายใหม่", 12_000_000, 24, 2_400_000, 120_000, "apartment"),
  multi("อพาร์ตเมนต์ยกตึก (หลุดจำนอง)", "ธนาคารยึดมาขาย ต้องหาผู้จัดการใหม่", 4_500_000, 10, 900_000, 42_000, "apartment"),
  multi("มินิมอลล์", "ร้านค้าเช่าเต็ม ติดถนนใหญ่", 7_500_000, 1, 1_500_000, 75_000, "mall"),
  multi("คาร์แคร์ล้างรถ", "ใกล้ห้าง ลูกค้าแน่นวันหยุด", 3_750_000, 1, 750_000, 36_000, "carwash", false),
  multi("คาร์แคร์อัตโนมัติ", "เครื่องใหม่ จ้างคนน้อย", 4_500_000, 1, 900_000, 45_000, "carwash", false),
  multi("ร้านสะดวกซัก", "หน้าหอพักใหญ่", 3_000_000, 1, 600_000, 30_000, "laundromat", false),
  cashBuy("แฟรนไชส์ร้านพิซซ่า", "สาขาในชุมชน มีผู้จัดการแล้ว", 900_000, 45_000, "franchise"),
  cashBuy("แฟรนไชส์ร้านพิซซ่า", "สาขาในห้าง ลูกค้าเยอะ", 1_500_000, 75_000, "franchise"),
  multi("โรงแรมเล็ก B&B", "เมืองท่องเที่ยว เจ้าของเดิมเกษียณ", 6_000_000, 1, 1_200_000, 54_000, "bnb", false),
];

// จ่ายซะ: ฿3,000–฿45,000 จ่ายสด (เงินไม่พอ ระบบกู้ธนาคารให้)
export const DOODADS: { text: string; amount: number }[] = [
  { text: "เลี้ยงข้าวเพื่อนมื้อหรู", amount: 3_000 },
  { text: "ค่ากาแฟคาเฟ่ทั้งเดือน", amount: 3_000 },
  { text: "โดนใบสั่งขับรถเร็ว", amount: 4_500 },
  { text: "ซ่อมจอมือถือ", amount: 4_500 },
  { text: "ใส่ซองงานแต่งเพื่อนสนิท", amount: 6_000 },
  { text: "ตั๋วคอนเสิร์ต", amount: 6_000 },
  { text: "ซื้อเสื้อผ้าแบรนด์เนมช่วงเซลล์", amount: 7_500 },
  { text: "ไม้กอล์ฟชุดใหม่", amount: 9_000 },
  { text: "ปาร์ตี้วันเกิด", amount: 9_000 },
  { text: "พาแมวไปหาหมอ", amount: 12_000 },
  { text: "สมัครฟิตเนสรายปี", amount: 12_000 },
  { text: "ทำฟัน", amount: 18_000 },
  { text: "ตู้เย็นเสีย ซื้อใหม่", amount: 19_500 },
  { text: "ทริปพักผ่อนสุดสัปดาห์", amount: 22_500 },
  { text: "ซื้อทีวีจอใหญ่", amount: 30_000 },
  { text: "ซ่อมเกียร์รถ", amount: 45_000 },
];

export type MarketCard =
  | {
      type: "sellAsset";
      text: string;
      tag: string;
      price: number;
      /** ราคาต่อห้อง/ต่อหลัง (คูณจำนวนหน่วย) */
      perUnit?: boolean;
      /** ให้ราคาเป็นกี่เท่าของราคาซื้อ (ใช้แทน price) */
      multiple?: number;
    }
  | { type: "sellStock"; text: string; stock: StockKind; price: number }
  | { type: "split"; text: string; stock: StockKind; factor: number }
  | { type: "rentUp"; text: string; amount: number }
  | { type: "expense"; text: string; tags: string[]; amount: number }
  /** ทรัพย์สิน/ธุรกิจกลุ่มนี้ได้กระแสเงินสดเพิ่ม (ถาวร) */
  | { type: "cashflowUp"; text: string; tags: string[]; amount: number };

// ตลาด: มีผลกับทุกคนที่ถือสินทรัพย์นั้น · ขายได้เงิน = ราคาเสนอซื้อ − จำนอง
export const MARKETS: MarketCard[] = [
  { type: "sellAsset", text: "ครอบครัวลูกสองย้ายเข้าเมือง ต้องการบ้าน 3/2 ให้ราคา ฿3,000,000", tag: "house32", price: 3_000_000 },
  { type: "split", text: "บริษัทเอนเตอร์เทนเมนต์แตกพาร์ 1 เป็น 2 ใครถืออยู่ได้จำนวนหุ้น ×2", stock: "ent", factor: 2 },
  { type: "split", text: "ตลาดตก บริษัทเอนเตอร์เทนเมนต์รวมพาร์ 2 เป็น 1 ใครถืออยู่จำนวนหุ้น ÷2", stock: "ent", factor: 0.5 },
  { type: "sellStock", text: "ข่าวดีบริษัทอิเล็กทรอนิกส์ หุ้นพุ่งไป ฿900", stock: "elec", price: 900 },
  { type: "sellStock", text: "ยาตัวใหม่ได้รับอนุมัติ หุ้นบริษัทยาพุ่งไป ฿1,200", stock: "pharma", price: 1_200 },
  { type: "sellStock", text: "ตลาดหุ้นขาขึ้น กองทุนรวมพุ่งไป ฿1,200", stock: "fund", price: 1_200 },
  { type: "sellStock", text: "นักสะสมรับซื้อเหรียญทองคำ เหรียญละ ฿30,000", stock: "gold", price: 30_000 },
  { type: "sellStock", text: "ราคาทองขึ้น ร้านทองรับซื้อเหรียญละ ฿45,000", stock: "gold", price: 45_000 },
  { type: "sellAsset", text: "ครอบครัวเล็กอยากได้บ้าน 2/1 ให้ราคา ฿1,800,000", tag: "house21", price: 1_800_000 },
  { type: "sellAsset", text: "มีคนขอซื้อบ้าน 2/1 ราคา ฿1,950,000", tag: "house21", price: 1_950_000 },
  { type: "sellAsset", text: "มีคนขอซื้อบ้าน 3/2 ราคา ฿2,400,000", tag: "house32", price: 2_400_000 },
  { type: "sellAsset", text: "ตลาดบ้านร้อนแรง คนแย่งซื้อบ้าน 3/2 ราคา ฿4,050,000", tag: "house32", price: 4_050_000 },
  { type: "sellAsset", text: "อาจารย์มหาวิทยาลัยต้องการคอนโด ให้ราคา ฿1,650,000", tag: "condo21", price: 1_650_000 },
  { type: "sellAsset", text: "นักลงทุนกวาดซื้อคอนโด ให้ราคา ฿1,950,000", tag: "condo21", price: 1_950_000 },
  { type: "sellAsset", text: "บริษัทอสังหาฯ จะทำหมู่บ้าน ขอซื้อที่ดินแปลงละ ฿600,000", tag: "land", price: 600_000 },
  { type: "sellAsset", text: "ห้างใหม่จะมาเปิด นายทุนกว้านซื้อที่ดินแปลงละ ฿1,200,000", tag: "land", price: 1_200_000 },
  { type: "sellAsset", text: "นักลงทุนขอซื้ออพาร์ตเมนต์ยกตึก ห้องละ ฿900,000", tag: "apartment", price: 900_000, perUnit: true },
  { type: "sellAsset", text: "กองทุนอสังหาฯ ขอซื้ออพาร์ตเมนต์ ห้องละ ฿1,350,000", tag: "apartment", price: 1_350_000, perUnit: true },
  { type: "sellAsset", text: "นายทุนใหญ่ขอซื้อศูนย์การค้า ให้ราคา 2 เท่าของราคาซื้อ", tag: "mall", price: 0, multiple: 2 },
];

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
/** หน่วยเงินในเกม: บาท (ตัวเลขการ์ดตั้งจากสเปก USD × 30) */
export const money = (n: number) => `${n < 0 ? "−" : ""}฿${thb.format(Math.abs(Math.round(n)))}`;

// ---------- ทางด่วน (วงนอก) ----------

/** เข้าทางด่วนแล้วได้รายได้ต่อรอบ = รายได้จากทรัพย์สิน × ตัวคูณนี้ */
export const FAST_MULTIPLIER = 20;
/** ชนะเมื่อรายได้ต่อรอบเพิ่มขึ้นจากตอนเข้าทางด่วนเท่านี้ หรือซื้อความฝันของตัวเองได้ */
export const FAST_GOAL = 1_500_000;

export type FastBusiness = { name: string; short: string; cost: number; cashflow: number };

export const FAST_BUSINESSES: FastBusiness[] = [
  { name: "โรงแรมบูทีค", short: "โรงแรมบูทีค", cost: 18_000_000, cashflow: 450_000 },
  { name: "ห้างสรรพสินค้าขนาดเล็ก", short: "ห้างเล็ก", cost: 30_000_000, cashflow: 780_000 },
  { name: "โรงงานน้ำดื่ม", short: "โรงงานน้ำดื่ม", cost: 9_000_000, cashflow: 240_000 },
  { name: "แฟรนไชส์กาแฟ 10 สาขา", short: "กาแฟ 10 สาขา", cost: 6_000_000, cashflow: 165_000 },
  { name: "โรงเรียนกวดวิชา", short: "กวดวิชา", cost: 4_500_000, cashflow: 120_000 },
  { name: "คลินิกทันตกรรม", short: "คลินิกฟัน", cost: 12_000_000, cashflow: 300_000 },
  { name: "สวนทุเรียน 50 ไร่", short: "สวนทุเรียน", cost: 15_000_000, cashflow: 360_000 },
  { name: "ปั๊มน้ำมัน 3 แห่ง", short: "ปั๊ม 3 แห่ง", cost: 24_000_000, cashflow: 600_000 },
  { name: "คอนโดทั้งตึก", short: "คอนโดทั้งตึก", cost: 36_000_000, cashflow: 960_000 },
  { name: "บริษัทขนส่ง", short: "ขนส่ง", cost: 21_000_000, cashflow: 510_000 },
  { name: "โรงพิมพ์", short: "โรงพิมพ์", cost: 7_500_000, cashflow: 180_000 },
  { name: "ศูนย์การค้าชุมชน", short: "คอมมูนิตี้มอลล์", cost: 27_000_000, cashflow: 690_000 },
  { name: "รีสอร์ตริมทะเล", short: "รีสอร์ตทะเล", cost: 33_000_000, cashflow: 840_000 },
  { name: "โรงงานอาหารแช่แข็ง", short: "อาหารแช่แข็ง", cost: 19_500_000, cashflow: 480_000 },
  { name: "แอปจองคิวร้านค้า", short: "แอปจองคิว", cost: 3_000_000, cashflow: 90_000 },
  { name: "เครือร้านอาหาร 5 สาขา", short: "ร้านอาหาร 5 สาขา", cost: 13_500_000, cashflow: 330_000 },
];

export type Dream = { name: string; short: string; icon: string; cost: number };

export const DREAMS: Dream[] = [
  { name: "เที่ยวรอบโลก 1 ปี", short: "รอบโลก", icon: "🌍", cost: 9_000_000 },
  { name: "บ้านพักริมทะเล", short: "บ้านริมทะเล", icon: "🏖️", cost: 24_000_000 },
  { name: "ตั้งมูลนิธิช่วยเด็ก", short: "มูลนิธิ", icon: "🤝", cost: 15_000_000 },
  { name: "สร้างโรงเรียนในชนบท", short: "โรงเรียน", icon: "🏫", cost: 12_000_000 },
  { name: "เรือยอชต์ส่วนตัว", short: "เรือยอชต์", icon: "🛥️", cost: 30_000_000 },
  { name: "ฟาร์มออร์แกนิกของครอบครัว", short: "ฟาร์ม", icon: "🌱", cost: 18_000_000 },
  { name: "ส่งลูกเรียนต่างประเทศ", short: "ลูกเรียนนอก", icon: "🎓", cost: 10_500_000 },
  { name: "สตูดิโอศิลปะของตัวเอง", short: "สตูดิโอ", icon: "🎨", cost: 7_500_000 },
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

/** ช่วงราคาของหุ้น/กองทุน/เหรียญ จากการ์ดทั้งหมด (โชว์บนการ์ดให้รู้ว่าตอนนี้ถูกหรือแพง) */
export function priceRange(kind: StockKind) {
  const prices = [...SMALL_DEALS, ...BIG_DEALS].flatMap((d) => (d.type === "stock" && d.stock === kind ? [d.price] : []));
  for (const m of MARKETS) if (m.type === "sellStock" && m.stock === kind) prices.push(m.price);
  return { lo: Math.min(...prices), hi: Math.max(...prices) };
}

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
  { name: "พนักงานทำความสะอาด", salary: 51_000, tax: 9_000, house: 6_000, car: 3_000, card: 1_800, other: 9_000, child: 2_100, savings: 18_000 },
  { name: "ตำรวจ", salary: 90_000, tax: 17_400, house: 12_000, car: 3_000, card: 1_800, other: 21_000, child: 4_800, savings: 15_600 },
  { name: "ทนายความ", salary: 225_000, tax: 54_000, house: 33_000, car: 6_600, card: 6_000, other: 48_000, child: 11_400, savings: 12_000 },
  { name: "นักบิน", salary: 285_000, tax: 69_000, house: 39_000, car: 9_000, card: 7_500, other: 60_000, child: 14_400, savings: 75_000 },
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

/**
 * กระดานสนามแข่งหนู 24 ช่อง: โอกาสอยู่ทุกช่องเว้นช่อง (12 ช่อง)
 * ช่องระหว่างโอกาสเป็นชุดซ้ำ 3 รอบ: ตลาด → จ่ายซะ → ช่องพิเศษ → เงินเดือน
 * เงินเดือนห่างกันทุก 8 ช่อง และทำบุญ/มีลูก/ตกงาน ก็ห่างกันทุก 8 ช่องเหมือนกัน
 */
export const BOARD: Square[] = (() => {
  const special: Square[] = ["charity", "baby", "downsize"];
  return special.flatMap((sp): Square[] => [
    "opportunity", "market", "opportunity", "doodad", "opportunity", sp, "opportunity", "payday",
  ]);
})();

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
  news("elec", 450, "ได้ลูกค้าใหม่จากต่างประเทศ"),
  news("pharma", 450, "ยื่นจดสิทธิบัตรยาตัวใหม่"),
  news("ent", 750, "คอนเสิร์ตใหญ่บัตรหมดใน 5 นาที"),
  news("fund", 450, "ธนาคารกลางลดดอกเบี้ย"),
  cashBuy("สลากออมทรัพย์", "ฝากครบกำหนดได้ดอกเบี้ยทุกเดือน", 36_000, 600, "cd"),
  gold(10_500, 8, "ร้านทองเก่าปิดกิจการ ขายเหรียญทองคำ 8 เหรียญ เหรียญละ ฿10,500"),
  home("บ้าน 2/1", "ลูกเจ้าของได้มรดก แต่อยู่ต่างจังหวัด อยากขาย", 1_350_000, 45_000, 4_200, "house21"),
  home("บ้าน 3/2", "ใกล้โรงพยาบาลเปิดใหม่ พยาบาลมาเช่า", 1_800_000, 105_000, 7_500, "house32"),
  home("คอนโด 2/1", "นักลงทุนเทขายห้องทั้งชั้น", 1_125_000, 45_000, 2_400, "condo21"),
  cashBuy("ที่ดินเปล่า 15 ไร่", "ติดคลองชลประทาน แปลงสวย", 90_000, 0, "land"),
  cashBuy("ตู้น้ำดื่มหยอดเหรียญ 3 ตู้", "ตั้งในชุมชนแออัด คนเติมน้ำทุกวัน", 30_000, 3_000, "vending"),
  { type: "lend", text: "น้องชายขอยืมเงินไปลงทุนขายของออนไลน์ (ไม่ได้คืน)", amount: 15_000 },
  { type: "lend", text: "เพื่อนสนิทขอยืมเงินจ่ายค่าเทอมลูก (ไม่ได้คืน)", amount: 6_000 },
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
  multi("อพาร์ตเมนต์ 4 ห้อง", "เจ้าของมีหลายตึก อยากขายตึกเล็กออก", 2_400_000, 4, 600_000, 24_000, "apartment"),
  multi("อพาร์ตเมนต์ 4 ห้อง", "ใกล้ตลาดสด ผู้เช่าเป็นแม่ค้า", 2_250_000, 4, 600_000, 21_000, "apartment"),
  multi("อพาร์ตเมนต์ 8 ห้อง", "ห้องว่าง 2 ห้อง ต้องหาผู้เช่าเพิ่ม", 4_200_000, 8, 840_000, 33_000, "apartment"),
  multi("อพาร์ตเมนต์ 8 ห้อง", "ผู้จัดการเดิมดูแลต่อ ไม่ต้องลงแรง", 5_100_000, 8, 1_020_000, 51_000, "apartment"),
  multi("อพาร์ตเมนต์ 12 ห้อง", "ใกล้โรงพยาบาล ผู้เช่าเป็นพยาบาลกะดึก", 6_600_000, 12, 1_320_000, 66_000, "apartment"),
  multi("อพาร์ตเมนต์ 12 ห้อง", "ทายาทแบ่งมรดกไม่ลงตัว ต้องขาย", 5_700_000, 12, 1_140_000, 60_000, "apartment"),
  multi("อพาร์ตเมนต์ 16 ห้อง", "ใกล้นิคมอุตสาหกรรม ห้องเต็มตลอด", 8_400_000, 16, 1_680_000, 84_000, "apartment"),
  multi("อพาร์ตเมนต์ 24 ห้อง", "ตึกเก่าต้องทาสีใหม่ ราคาต่อรองได้", 10_500_000, 24, 2_100_000, 105_000, "apartment"),
  multi("อพาร์ตเมนต์ 24 ห้อง", "ใกล้มหาวิทยาลัยเอกชน", 12_600_000, 24, 2_520_000, 126_000, "apartment"),
  multi("อพาร์ตเมนต์ยกตึก (หลุดจำนอง)", "เจ้าของเดิมหนีหนี้ ห้องว่างครึ่งตึก", 3_900_000, 10, 780_000, 30_000, "apartment"),
  multi("มินิมอลล์", "ร้านสะดวกซื้อเช่าหัวมุม สัญญายาว", 6_900_000, 1, 1_380_000, 69_000, "mall"),
  multi("มินิมอลล์", "ทำเลใหม่ ยังมีล็อกว่าง", 7_800_000, 1, 1_560_000, 60_000, "mall"),
  multi("ศูนย์การค้าชุมชน", "ใกล้สถานีรถไฟฟ้า ร้านอาหารเช่าเต็ม", 9_000_000, 1, 1_800_000, 90_000, "mall"),
  multi("คาร์แคร์ล้างรถ", "เช่าที่ในปั๊มน้ำมัน สัญญา 10 ปี", 4_050_000, 1, 810_000, 39_000, "carwash", false),
  multi("คาร์แคร์ล้างรถ", "เจ้าของย้ายไปต่างจังหวัด", 3_600_000, 1, 750_000, 36_000, "carwash", false),
  multi("ร้านสะดวกซัก", "ในคอนโดใหญ่ 800 ห้อง", 3_300_000, 1, 660_000, 33_000, "laundromat", false),
  multi("ร้านสะดวกซัก", "ใกล้มหาวิทยาลัย นักศึกษาใช้ทุกวัน", 2_850_000, 1, 600_000, 27_000, "laundromat", false),
  cashBuy("แฟรนไชส์ร้านพิซซ่า", "สาขาริมทางหลวง ยอดเดลิเวอรีสูง", 1_200_000, 60_000, "franchise"),
  cashBuy("แฟรนไชส์ร้านไก่ทอด", "สาขาในปั๊มน้ำมัน", 1_050_000, 48_000, "franchise"),
  cashBuy("แฟรนไชส์ร้านกาแฟ", "หน้าโรงพยาบาล คนเข้าออกทั้งวัน", 900_000, 42_000, "franchise"),
  cashBuy("แฟรนไชส์ร้านชานม", "ใกล้โรงเรียน ขายดีช่วงเย็น", 960_000, 45_000, "franchise"),
  multi("โรงแรมเล็ก B&B", "ริมทะเล จองเต็มช่วงไฮซีซั่น", 6_600_000, 1, 1_320_000, 60_000, "bnb", false),
  multi("โรงแรมเล็ก B&B", "บนดอย หน้าฝนคนน้อย", 5_400_000, 1, 1_080_000, 45_000, "bnb", false),
  multi("โฮสเทล", "ย่านเมืองเก่า นักท่องเที่ยวต่างชาติเยอะ", 4_800_000, 1, 960_000, 42_000, "bnb", false),
  multi("ร้านอาหารพร้อมกิจการ", "พ่อครัวเดิมอยู่ต่อ ลูกค้าประจำแน่น", 3_000_000, 1, 600_000, 27_000, "restaurant", false),
  multi("โกดังให้เช่า", "บริษัทขนส่งเช่าระยะยาว", 6_000_000, 1, 1_200_000, 57_000, "warehouse"),
  multi("ห้องเก็บของให้เช่า", "กลางเมือง คนคอนโดใช้เก็บของ", 4_500_000, 1, 900_000, 42_000, "storage"),
  multi("อาคารพาณิชย์ 3 คูหา", "ติดถนนใหญ่ มีผู้เช่าทำร้านค้าครบ", 5_400_000, 3, 1_080_000, 48_000, "shophouse"),
  multi("อาคารพาณิชย์ 3 คูหา", "ย่านเศรษฐกิจใหม่ ยังเช่าไม่เต็ม", 4_800_000, 3, 960_000, 30_000, "shophouse"),
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
  { text: "ซื้อหูฟังไร้สายรุ่นใหม่", amount: 7_500 },
  { text: "สมัครสตรีมมิงทุกแอปแบบรายปี", amount: 6_000 },
  { text: "ซื้อนาฬิกาอัจฉริยะ", amount: 12_000 },
  { text: "เปลี่ยนมือถือรุ่นใหม่ล่าสุด", amount: 36_000 },
  { text: "ซื้อโน้ตบุ๊กเครื่องใหม่ทั้งที่เครื่องเก่ายังใช้ได้", amount: 30_000 },
  { text: "ซื้อเครื่องชงกาแฟไว้ที่บ้าน", amount: 15_000 },
  { text: "ซ่อมแอร์ที่บ้าน", amount: 7_500 },
  { text: "ปลวกขึ้นบ้าน จ้างกำจัด", amount: 12_000 },
  { text: "หลังคารั่ว ซ่อมด่วน", amount: 21_000 },
  { text: "เครื่องซักผ้าพัง ซื้อใหม่", amount: 13_500 },
  { text: "เปลี่ยนยางรถครบ 4 เส้น", amount: 18_000 },
  { text: "แบตเตอรี่รถหมด", amount: 4_500 },
  { text: "ค่าปรับจอดรถผิดที่ โดนล็อกล้อ", amount: 3_000 },
  { text: "ขับรถชนท้าย จ่ายส่วนแรกประกัน", amount: 15_000 },
  { text: "ท้องเสีย นอนโรงพยาบาลหนึ่งคืน", amount: 9_000 },
  { text: "ตัดแว่นสายตาใหม่", amount: 6_000 },
  { text: "ทำสีผมและทำเล็บที่ร้านหรู", amount: 4_500 },
  { text: "ซื้อกระเป๋าแบรนด์เนม", amount: 39_000 },
  { text: "ซื้อรองเท้าวิ่งรุ่นลิมิเต็ด", amount: 7_500 },
  { text: "พาครอบครัวกินบุฟเฟต์โรงแรม", amount: 6_000 },
  { text: "ไปเที่ยวต่างประเทศช่วงหยุดยาว", amount: 45_000 },
  { text: "ค่าเรียนพิเศษลูกช่วงปิดเทอม", amount: 12_000 },
  { text: "ซื้อของขวัญวันเกิดแฟน", amount: 9_000 },
  { text: "งานบวชญาติ ช่วยค่าใช้จ่าย", amount: 7_500 },
  { text: "สั่งอาหารเดลิเวอรีทุกมื้อทั้งเดือน", amount: 4_500 },
  { text: "ซื้อจักรยานเสือหมอบ", amount: 27_000 },
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
  { type: "split", text: "บริษัทอิเล็กทรอนิกส์แตกพาร์ 1 เป็น 2 ใครถืออยู่ได้จำนวนหุ้น ×2", stock: "elec", factor: 2 },
  { type: "split", text: "บริษัทยาแตกพาร์ 1 เป็น 2 ใครถืออยู่ได้จำนวนหุ้น ×2", stock: "pharma", factor: 2 },
  { type: "split", text: "บริษัทยาถูกฟ้องคดีใหญ่ รวมพาร์ 2 เป็น 1 ใครถืออยู่จำนวนหุ้น ÷2", stock: "pharma", factor: 0.5 },
  { type: "sellStock", text: "ซีรีส์ใหม่ทำสถิติยอดชม หุ้นเอนเตอร์เทนเมนต์พุ่งไป ฿900", stock: "ent", price: 900 },
  { type: "sellStock", text: "ได้สัญญาส่งชิปให้ค่ายรถยนต์ไฟฟ้า หุ้นอิเล็กทรอนิกส์ขึ้นไป ฿750", stock: "elec", price: 750 },
  { type: "sellStock", text: "ต่างชาติไหลเข้าตลาดหุ้น กองทุนรวมขึ้นไป ฿900", stock: "fund", price: 900 },
  { type: "sellStock", text: "เศรษฐกิจโลกผันผวน คนแห่ซื้อทอง รับซื้อเหรียญละ ฿36,000", stock: "gold", price: 36_000 },
  { type: "sellAsset", text: "คู่แต่งงานใหม่หาบ้านหลังแรก ขอซื้อบ้าน 2/1 ราคา ฿1,875,000", tag: "house21", price: 1_875_000 },
  { type: "sellAsset", text: "ครูย้ายมาประจำโรงเรียนใกล้ ๆ ขอซื้อบ้าน 3/2 ราคา ฿2,700,000", tag: "house32", price: 2_700_000 },
  { type: "sellAsset", text: "ถนนตัดใหม่ผ่านหมู่บ้าน ราคาบ้าน 3/2 ขึ้นไป ฿3,600,000", tag: "house32", price: 3_600_000 },
  { type: "sellAsset", text: "พนักงานบริษัทใหญ่ย้ายมาทำงานใกล้ ขอซื้อคอนโด ราคา ฿1,800,000", tag: "condo21", price: 1_800_000 },
  { type: "sellAsset", text: "รัฐประกาศสร้างถนนวงแหวน ขอซื้อที่ดินแปลงละ ฿900,000", tag: "land", price: 900_000 },
  { type: "sellAsset", text: "บริษัทบริหารหอพักขอซื้ออพาร์ตเมนต์ ห้องละ ฿1,050,000", tag: "apartment", price: 1_050_000, perUnit: true },
  { type: "sellAsset", text: "กองทรัสต์อสังหาฯ ขอซื้ออพาร์ตเมนต์ ห้องละ ฿1,200,000", tag: "apartment", price: 1_200_000, perUnit: true },
  { type: "sellAsset", text: "เครือคาร์แคร์ใหญ่ขอซื้อกิจการล้างรถ ให้ 1.5 เท่าของราคาซื้อ", tag: "carwash", price: 0, multiple: 1.5 },
  { type: "sellAsset", text: "นักลงทุนขอซื้อร้านสะดวกซัก ให้ 1.5 เท่าของราคาซื้อ", tag: "laundromat", price: 0, multiple: 1.5 },
  { type: "sellAsset", text: "บริษัทแม่ขอซื้อสาขาแฟรนไชส์คืน ให้ 2 เท่าของเงินลงทุน", tag: "franchise", price: 0, multiple: 2 },
  { type: "sellAsset", text: "ห้างค้าปลีกขอซื้ออาคารพาณิชย์ คูหาละ ฿2,400,000", tag: "shophouse", price: 2_400_000, perUnit: true },
  { type: "sellAsset", text: "บริษัทโลจิสติกส์ขยายกิจการ ขอซื้อโกดัง ราคา ฿10,500,000", tag: "warehouse", price: 10_500_000 },
  { type: "rentUp", text: "ค่าครองชีพสูงขึ้น ค่าเช่าทั่วเมืองขึ้น ทรัพย์สินให้เช่าทุกรายการ +฿1,500/เดือน", amount: 1_500 },
  { type: "expense", text: "พายุเข้า หลังคาบ้านเช่าเสียหาย ใครมีบ้านหรือคอนโดให้เช่าจ่ายค่าซ่อม ฿30,000", tags: ["house21", "house32", "condo21"], amount: 30_000 },
  { type: "expense", text: "ผู้เช่าค้างค่าเช่าแล้วหนี ใครมีอพาร์ตเมนต์เสียเงิน ฿60,000", tags: ["apartment"], amount: 60_000 },
  { type: "cashflowUp", text: "แอปส่งอาหารลดค่าคอมมิชชัน ร้านอาหารและแฟรนไชส์ได้กำไรเพิ่ม +฿6,000/เดือน ต่อกิจการ", tags: ["franchise", "restaurant", "coffee"], amount: 6_000 },
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

/**
 * เวอร์ชันชุดการ์ด/ตัวเลข (เปลี่ยนเองเมื่อแก้ข้อมูลข้างบน)
 * สถานะเกมเก็บการ์ดเป็นลำดับในกอง ถ้าชุดการ์ดเปลี่ยนระหว่างเล่น ลำดับเดิมจะชี้ไปคนละใบ
 * จึงใช้ค่านี้ตรวจ: มือถือที่เปิดหน้าเวอร์ชันเก่าจะรีเฟรชเอง และห้องที่เริ่มด้วยชุดเก่าจะเล่นต่อไม่ได้
 */
export const DECK_VERSION = (() => {
  const src = JSON.stringify([BOARD, PROFESSIONS, SMALL_DEALS, BIG_DEALS, DOODADS, MARKETS, FAST_BUSINESSES, DREAMS, FAST_EVENTS, LOAN_UNIT]);
  let h = 5381;
  for (let i = 0; i < src.length; i++) h = ((h << 5) + h + src.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
})();

/**
 * ROI ต่อปี = กระแสเงินสดต่อปี ÷ เงินที่ควักจ่ายจริง (เงินดาวน์) × 100
 * ใช้เทียบดีลกันง่าย ๆ ว่าเงินที่ลงไปทำงานได้คุ้มแค่ไหน
 */
export function roiText(down: number, cashflowPerMonth: number) {
  if (cashflowPerMonth === 0) return "ROI 0% (ไม่มีกระแสเงินสด รอขายทำกำไร)";
  if (down <= 0) return cashflowPerMonth > 0 ? "ROI ∞ (ไม่ต้องควักเงินลง)" : "ROI ติดลบ (ต้องควักจ่ายทุกเดือน)";
  const pct = ((cashflowPerMonth * 12) / down) * 100;
  const shown = Math.abs(pct) >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10;
  if (cashflowPerMonth < 0) return `ROI ${shown}%/ปี (ค่าเช่าไม่พอผ่อน ต้องควักจ่ายทุกเดือน)`;
  return `ROI ${shown}%/ปี · คืนทุนใน ~${Math.ceil(down / cashflowPerMonth)} เดือน`;
}

CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"pv" numeric(12, 2) NOT NULL,
	"bv" numeric(12, 2) NOT NULL,
	"days" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_days_positive" CHECK ("products"."days" > 0),
	CONSTRAINT "products_price_nonneg" CHECK ("products"."price" >= 0 and "products"."pv" >= 0 and "products"."bv" >= 0)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- ผู้ดูแลคนแรก = ผู้ใช้คนแรกของระบบ (เจ้าของระบบ)
UPDATE "users" SET "is_admin" = true WHERE "id" = (SELECT "id" FROM "users" ORDER BY "created_at" LIMIT 1);
--> statement-breakpoint
INSERT INTO "products" ("name", "category", "description", "price", "pv", "bv", "days", "sort_order")
VALUES
  ('ชุดอาหารเช้านิวทริไลท์ (โปรตีน ขนาด 900 กรัม)', 'ชุดแนะนำ', 'ออล แพลนท์ โปรตีน · บอดี้คีย์ 2 กล่อง · ดับเบิ้ล เอ็กซ์ · ทริปเปิล โอเมก้า', 9039, 2798, 9039, 30, 1),
  ('ชุดบีกิน โปรแกรม', 'ชุดแนะนำ', 'บีกิน · โพรไบโอติก · ไฟเบอร์ พาวเดอร์ พลัส', 5500, 1703, 5500, 30, 2),
  ('ออล แพลนท์ โปรตีน 900 กรัม', 'สุขภาพ', NULL, 2300, 712, 2300, 30, 20),
  ('บอดี้คีย์ อาหารควบคุมหรือลดน้ำหนัก สูตรน้ำตาลน้อยกว่า', 'สุขภาพ', '14 ซอง · โกโก้ กาแฟ เบอร์รี่ ชานม กล้วย', 1700, 526, 1700, 14, 21),
  ('ดับเบิ้ล เอ็กซ์ ไฟโตเบลนด์', 'สุขภาพ', '186 เม็ด', 2364, 732, 2364, 31, 22),
  ('ทริปเปิล โอเมก้า', 'สุขภาพ', '30 แคปซูล · วันละ 1 แคปซูล', 975, 302, 975, 30, 23),
  ('บีกิน', 'สุขภาพ', '30 ซอง · วันละ 1 ซอง', 2150, 666, 2150, 30, 24),
  ('โพรไบโอติก', 'สุขภาพ', '30 ซอง · วันละ 1 ซอง', 1650, 511, 1650, 30, 25),
  ('ไฟเบอร์ พาวเดอร์ พลัส', 'สุขภาพ', '30 ซอง · วันละ 1 ซอง', 1700, 526, 1700, 30, 26);

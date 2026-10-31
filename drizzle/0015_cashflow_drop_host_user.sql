-- ห้องเดิมผูกกับบัญชีผู้ใช้ ใช้ต่อไม่ได้ (เปลี่ยนเป็น host cookie) ลบทิ้ง
DELETE FROM "cashflow_rooms";
--> statement-breakpoint
ALTER TABLE "cashflow_rooms" DROP CONSTRAINT "cashflow_rooms_host_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "cashflow_rooms" DROP COLUMN "host_id";
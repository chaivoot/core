CREATE TYPE "public"."team_status" AS ENUM('product', 'sop', 'business', 'forty');--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "status" "team_status" DEFAULT 'business' NOT NULL;--> statement-breakpoint
UPDATE "team_members" SET "status" = 'forty' WHERE "self_forty" = true;

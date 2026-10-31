ALTER TABLE "cashflow_rooms" ADD COLUMN "creator_ip_hash" text;--> statement-breakpoint
CREATE INDEX "cashflow_rooms_created_at_idx" ON "cashflow_rooms" USING btree ("created_at");
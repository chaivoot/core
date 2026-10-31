CREATE TABLE "cashflow_rooms" (
	"code" text PRIMARY KEY NOT NULL,
	"host_id" uuid NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cashflow_rooms" ADD CONSTRAINT "cashflow_rooms_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cashflow_rooms_updated_at_idx" ON "cashflow_rooms" USING btree ("updated_at");
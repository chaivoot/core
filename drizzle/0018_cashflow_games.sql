CREATE TABLE "cashflow_games" (
	"id" text PRIMARY KEY NOT NULL,
	"room_code" text NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"ended_by" text NOT NULL,
	"player_count" integer NOT NULL,
	"report" jsonb NOT NULL,
	"events" jsonb NOT NULL,
	"deck_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cashflow_games_created_at_idx" ON "cashflow_games" USING btree ("created_at");
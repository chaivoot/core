CREATE TYPE "public"."activity_type" AS ENUM('appointment', 'product_intro', 'business_plan', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."interest" AS ENUM('product', 'business');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"channel" text,
	"interest" "interest",
	"note" text,
	"added_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_user_id" text NOT NULL,
	"name" text,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_line_user_id_unique" UNIQUE("line_user_id")
);
--> statement-breakpoint
CREATE TABLE "weekly_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"priority_rank" smallint,
	"priority_score" smallint,
	"products_used" boolean DEFAULT false NOT NULL,
	"products_score" smallint,
	"learn_listen" boolean DEFAULT false NOT NULL,
	"learn_listen_detail" text,
	"learn_read" boolean DEFAULT false NOT NULL,
	"learn_read_detail" text,
	"learn_meeting" boolean DEFAULT false NOT NULL,
	"learn_meeting_detail" text,
	"learn_academy" boolean DEFAULT false NOT NULL,
	"learn_academy_detail" text,
	"learning_score" smallint,
	"team_work" boolean DEFAULT false NOT NULL,
	"team_work_detail" text,
	"action_score" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "priority_rank_range" CHECK ("weekly_reviews"."priority_rank" between 1 and 3),
	CONSTRAINT "priority_score_range" CHECK ("weekly_reviews"."priority_score" between 0 and 10),
	CONSTRAINT "products_score_range" CHECK ("weekly_reviews"."products_score" between 0 and 10),
	CONSTRAINT "learning_score_range" CHECK ("weekly_reviews"."learning_score" between 0 and 10),
	CONSTRAINT "action_score_range" CHECK ("weekly_reviews"."action_score" between 0 and 10)
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reviews" ADD CONSTRAINT "weekly_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_user_date_idx" ON "activities" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "activities_contact_idx" ON "activities" USING btree ("contact_id","date");--> statement-breakpoint
CREATE INDEX "contacts_user_added_idx" ON "contacts" USING btree ("user_id","added_on");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_reviews_user_week_idx" ON "weekly_reviews" USING btree ("user_id","week_start");
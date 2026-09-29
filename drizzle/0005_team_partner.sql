CREATE TABLE "team_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"inviter_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "team_owner_id" uuid;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_team_owner_id_users_id_fk" FOREIGN KEY ("team_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
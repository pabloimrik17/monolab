CREATE TABLE "roger_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"instrument_id" uuid NOT NULL,
	"state" varchar(20) NOT NULL,
	"entry_price" numeric(14, 4) NOT NULL,
	"quantity" integer,
	"buy_commission" numeric(10, 2),
	"buy_date" date,
	"exit_price" numeric(14, 4),
	"sell_commission" numeric(10, 2),
	"sell_date" date,
	"state_since" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "roger_entries_state_check" CHECK ("roger_entries"."state" IN ('WATCHING', 'SHORTLISTED', 'TRADER_BOUGHT', 'BUY_ORDER', 'INVESTED', 'SELL_ORDER', 'SOLD'))
);
--> statement-breakpoint
ALTER TABLE "roger_entries" ADD CONSTRAINT "roger_entries_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "roger_entries_instrument_id_idx" ON "roger_entries" USING btree ("instrument_id");
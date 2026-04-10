CREATE TABLE "instruments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar(20) NOT NULL,
	"asset_class" varchar(20) NOT NULL,
	"exchange" varchar(20),
	"sector" varchar(30),
	"replicates" varchar(200),
	"quotable" boolean DEFAULT true NOT NULL,
	CONSTRAINT "instruments_symbol_unique" UNIQUE("symbol")
);

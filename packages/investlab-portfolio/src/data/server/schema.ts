import { sql } from "drizzle-orm";
import {
    boolean,
    check,
    index,
    numeric,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

// Listed by path in the database package's drizzle.config.ts; `db:generate` diffs it against the migrations.

export const instruments = pgTable("instruments", {
    id: uuid("id").primaryKey().defaultRandom(),
    symbol: varchar("symbol", { length: 20 }).unique().notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(),
    assetClass: varchar("asset_class", { length: 20 }).notNull(),
    exchange: varchar("exchange", { length: 20 }),
    sector: varchar("sector", { length: 30 }),
    replicates: varchar("replicates", { length: 200 }),
    quotable: boolean("quotable").default(true).notNull(),
});

export const portfolioItems = pgTable(
    "portfolio_items",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        instrumentId: uuid("instrument_id")
            .notNull()
            .references(() => instruments.id),
        broker: varchar("broker", { length: 100 }).notNull(),
        targetWeight: numeric("target_weight", { precision: 5, scale: 2 }).notNull().default("0"),
        currentValue: numeric("current_value", { precision: 12, scale: 2 }).notNull().default("0"),
        notes: text("notes"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index("portfolio_items_instrument_id_idx").on(table.instrumentId),
        check(
            "portfolio_items_target_weight_range",
            sql`${table.targetWeight} >= 0 AND ${table.targetWeight} <= 100`,
        ),
    ],
);

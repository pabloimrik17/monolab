import { sql } from "drizzle-orm";
import {
    check,
    date,
    index,
    integer,
    numeric,
    pgTable,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { instruments } from "@m0n0lab/investlab-catalog/server";

export const rogerEntries = pgTable(
    "roger_entries",
    {
        id: uuid("id").primaryKey(),
        instrumentId: uuid("instrument_id")
            .notNull()
            .references(() => instruments.id, { onDelete: "restrict" }),
        state: varchar("state", { length: 20 }).notNull(),
        entryPrice: numeric("entry_price", { precision: 14, scale: 4 }).notNull(),
        quantity: integer("quantity"),
        buyCommission: numeric("buy_commission", { precision: 10, scale: 2 }),
        buyDate: date("buy_date"),
        exitPrice: numeric("exit_price", { precision: 14, scale: 4 }),
        sellCommission: numeric("sell_commission", { precision: 10, scale: 2 }),
        sellDate: date("sell_date"),
        stateSince: timestamp("state_since", { withTimezone: true }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    },
    (table) => [
        index("roger_entries_instrument_id_idx").on(table.instrumentId),
        // Spelled out: drizzle-kit's loader cannot resolve the `#domain` alias.
        check(
            "roger_entries_state_check",
            sql`${table.state} IN ('WATCHING', 'SHORTLISTED', 'TRADER_BOUGHT', 'BUY_ORDER', 'INVESTED', 'SELL_ORDER', 'SOLD')`,
        ),
    ],
);

import { boolean, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

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

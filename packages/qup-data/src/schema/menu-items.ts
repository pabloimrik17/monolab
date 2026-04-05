import { boolean, integer, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

export const menuItems = pgTable("menu_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    category: varchar("category", { length: 20 }).notNull(),
    description: text("description"),
    available: boolean("available").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
});

import { integer, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

import { menuItems } from "./menu-items.ts";
import { orders } from "./orders.ts";

export const orderItems = pgTable("order_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
        .references(() => orders.id)
        .notNull(),
    menuItemId: uuid("menu_item_id")
        .references(() => menuItems.id)
        .notNull(),
    menuItemName: varchar("menu_item_name", { length: 100 }).notNull(),
    quantity: integer("quantity").notNull(),
    customization: text("customization"),
});

import { Category, MenuItem } from "@m0n0lab/qup-domain";
import type { menuItems } from "../schema/menu-items.ts";

type MenuItemRow = typeof menuItems.$inferSelect;
type MenuItemInsert = typeof menuItems.$inferInsert;

export function menuItemToDomain(row: MenuItemRow): MenuItem {
    return MenuItem.reconstitute({
        id: row.id,
        name: row.name,
        category: row.category as Category,
        description: row.description ?? undefined,
        available: row.available,
        sortOrder: row.sortOrder,
    });
}

export function menuItemToRow(item: MenuItem): MenuItemInsert {
    return {
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description ?? null,
        available: item.available,
        sortOrder: item.sortOrder,
    };
}

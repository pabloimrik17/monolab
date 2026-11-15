import { describe, expect, it } from "vitest";
import { OrderItem } from "./order-item.ts";

describe("OrderItem", () => {
    describe("create", () => {
        it("keeps the menu item, quantity and customization", () => {
            const item = OrderItem.create({
                menuItemId: "mi-1",
                menuItemName: "Latte",
                quantity: 2,
                customization: "oat milk",
            })._unsafeUnwrap();

            expect(item).toEqual({
                menuItemId: "mi-1",
                menuItemName: "Latte",
                quantity: 2,
                customization: "oat milk",
            });
        });

        it("returns ValidationError for a quantity of zero", () => {
            const error = OrderItem.create({
                menuItemId: "mi-1",
                menuItemName: "Latte",
                quantity: 0,
            })._unsafeUnwrapErr();

            expect(error.code).toBe("VALIDATION_ERROR");
        });
    });
});

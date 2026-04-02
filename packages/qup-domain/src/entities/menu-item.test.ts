import { describe, expect, it } from "vitest";
import { Category } from "../value-objects/category.ts";
import { MenuItem } from "./menu-item.ts";

describe("MenuItem", () => {
    describe("create", () => {
        it("creates a menu item with defaults", () => {
            const result = MenuItem.create({
                name: "Espresso",
                category: Category.COFFEE,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const item = result.value;
                expect(item.name).toBe("Espresso");
                expect(item.category).toBe(Category.COFFEE);
                expect(item.available).toBe(true);
                expect(item.sortOrder).toBe(0);
                expect(item.id).toBeDefined();
            }
        });

        it("accepts optional props", () => {
            const result = MenuItem.create({
                name: "Latte",
                category: Category.COFFEE,
                description: "Milk coffee",
                available: false,
                sortOrder: 5,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.description).toBe("Milk coffee");
                expect(result.value.available).toBe(false);
                expect(result.value.sortOrder).toBe(5);
            }
        });

        it("returns ValidationError for empty name", () => {
            const result = MenuItem.create({
                name: "",
                category: Category.COFFEE,
            });
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
            }
        });

        it("trims the name", () => {
            const result = MenuItem.create({
                name: "  Espresso  ",
                category: Category.COFFEE,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.name).toBe("Espresso");
            }
        });
    });

    describe("toggleAvailability", () => {
        it("toggles from true to false", () => {
            const result = MenuItem.create({
                name: "Espresso",
                category: Category.COFFEE,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                result.value.toggleAvailability();
                expect(result.value.available).toBe(false);
            }
        });

        it("toggles from false to true", () => {
            const result = MenuItem.create({
                name: "Espresso",
                category: Category.COFFEE,
                available: false,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                result.value.toggleAvailability();
                expect(result.value.available).toBe(true);
            }
        });
    });

    describe("update", () => {
        it("updates name and category", () => {
            const result = MenuItem.create({
                name: "Espresso",
                category: Category.COFFEE,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const updateResult = result.value.update({
                    name: "Green Tea",
                    category: Category.TEA,
                });
                expect(updateResult.isOk()).toBe(true);
                expect(result.value.name).toBe("Green Tea");
                expect(result.value.category).toBe(Category.TEA);
            }
        });

        it("returns ValidationError for empty name update", () => {
            const result = MenuItem.create({
                name: "Espresso",
                category: Category.COFFEE,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const updateResult = result.value.update({ name: "" });
                expect(updateResult.isErr()).toBe(true);
                if (updateResult.isErr()) {
                    expect(updateResult.error.code).toBe("VALIDATION_ERROR");
                }
            }
        });

        it("partially updates only provided fields", () => {
            const result = MenuItem.create({
                name: "Espresso",
                category: Category.COFFEE,
                sortOrder: 1,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                result.value.update({ sortOrder: 10 });
                expect(result.value.name).toBe("Espresso");
                expect(result.value.sortOrder).toBe(10);
            }
        });
    });

    describe("reconstitute", () => {
        it("hydrates from raw props", () => {
            const item = MenuItem.reconstitute({
                id: "mi-1",
                name: "Latte",
                category: Category.COFFEE,
                description: "Creamy",
                available: true,
                sortOrder: 3,
            });
            expect(item.id).toBe("mi-1");
            expect(item.name).toBe("Latte");
        });
    });
});

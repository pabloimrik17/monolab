import { Container } from "inversify";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { domainModule } from "../domain.module.ts";
import { MenuItem } from "../entities/menu-item.ts";
import { TOKENS } from "../tokens.ts";
import { Category } from "../value-objects/category.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import type { UpdateMenuItemUseCase } from "./update-menu-item.use-case.ts";

describe("UpdateMenuItemUseCase", () => {
    let espresso: MenuItem;
    let updated: MenuItem[];
    let update: UpdateMenuItemUseCase;

    beforeEach(() => {
        espresso = MenuItem.create({ name: "Espresso", category: Category.COFFEE })._unsafeUnwrap();
        updated = [];
        const container = new Container();
        container.load(domainModule);
        container.bind(TOKENS.MenuItemRepository).toConstantValue({
            findById: (id: string) => okAsync(id === espresso.id ? espresso : null),
            update: (menuItem: MenuItem) => {
                updated.push(menuItem);
                return okAsync(undefined);
            },
        } satisfies Partial<MenuItemRepository>);
        update = container.get<UpdateMenuItemUseCase>(TOKENS.UpdateMenuItemUseCase);
    });

    describe("editing a menu item", () => {
        it("stores the item with its new details", async () => {
            const result = await update.execute(espresso.id, {
                name: "Double Espresso",
                available: false,
            });

            expect(result.isOk()).toBe(true);
            expect(updated).toEqual([espresso]);
            expect(espresso).toMatchObject({ name: "Double Espresso", available: false });
        });

        it("refuses an unknown item", async () => {
            const error = (
                await update.execute("unknown", { name: "Double Espresso" })
            )._unsafeUnwrapErr();

            expect(error.code).toBe("MENU_ITEM_NOT_FOUND");
        });

        it("refuses an empty name, storing nothing", async () => {
            const error = (await update.execute(espresso.id, { name: "" }))._unsafeUnwrapErr();

            expect(error.code).toBe("VALIDATION_ERROR");
            expect(updated).toEqual([]);
        });
    });
});

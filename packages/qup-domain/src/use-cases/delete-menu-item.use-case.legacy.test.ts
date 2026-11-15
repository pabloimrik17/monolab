import { Container } from "inversify";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { domainModule } from "../domain.module.ts";
import { MenuItem } from "../entities/menu-item.ts";
import { TOKENS } from "../tokens.ts";
import { Category } from "../value-objects/category.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import type { DeleteMenuItemUseCase } from "./delete-menu-item.use-case.ts";

describe("DeleteMenuItemUseCase", () => {
    let espresso: MenuItem;
    let deleted: string[];
    let remove: DeleteMenuItemUseCase;

    beforeEach(() => {
        espresso = MenuItem.create({ name: "Espresso", category: Category.COFFEE })._unsafeUnwrap();
        deleted = [];
        const container = new Container();
        container.load(domainModule);
        container.bind(TOKENS.MenuItemRepository).toConstantValue({
            findById: (id: string) => okAsync(id === espresso.id ? espresso : null),
            delete: (id: string) => {
                deleted.push(id);
                return okAsync(undefined);
            },
        } satisfies Partial<MenuItemRepository>);
        remove = container.get<DeleteMenuItemUseCase>(TOKENS.DeleteMenuItemUseCase);
    });

    describe("removing a menu item", () => {
        it("deletes an item on the menu", async () => {
            const result = await remove.execute(espresso.id);

            expect(result.isOk()).toBe(true);
            expect(deleted).toEqual([espresso.id]);
        });

        it("refuses an unknown item, deleting nothing", async () => {
            const error = (await remove.execute("unknown"))._unsafeUnwrapErr();

            expect(error.code).toBe("MENU_ITEM_NOT_FOUND");
            expect(deleted).toEqual([]);
        });
    });
});

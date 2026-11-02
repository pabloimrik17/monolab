import { Container } from "inversify";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { domainModule } from "../domain.module.ts";
import { MenuItem } from "../entities/menu-item.ts";
import { TOKENS } from "../tokens.ts";
import { Category } from "../value-objects/category.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import type { GetMenuUseCase } from "./get-menu.use-case.ts";

describe("GetMenuUseCase", () => {
    let espresso: MenuItem;
    let soldOut: MenuItem;
    let getMenu: GetMenuUseCase;

    beforeEach(() => {
        espresso = MenuItem.create({ name: "Espresso", category: Category.COFFEE })._unsafeUnwrap();
        soldOut = MenuItem.create({
            name: "Matcha",
            category: Category.TEA,
            available: false,
        })._unsafeUnwrap();
        const menu = [espresso, soldOut];
        const container = new Container();
        container.load(domainModule);
        container.bind(TOKENS.MenuItemRepository).toConstantValue({
            findAll: () => okAsync(menu),
            findAllAvailable: () => okAsync(menu.filter((item) => item.available)),
        } satisfies Partial<MenuItemRepository>);
        getMenu = container.get<GetMenuUseCase>(TOKENS.GetMenuUseCase);
    });

    describe("reading the menu", () => {
        it("lists every item, sold out ones included", async () => {
            const menu = (await getMenu.execute())._unsafeUnwrap();

            expect(menu).toEqual([espresso, soldOut]);
        });

        it("lists only the available items when asked to", async () => {
            const menu = (await getMenu.execute({ availableOnly: true }))._unsafeUnwrap();

            expect(menu).toEqual([espresso]);
        });
    });
});

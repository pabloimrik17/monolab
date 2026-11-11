import { Container } from "inversify";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { domainModule } from "../domain.module.ts";
import { TOKENS } from "../tokens.ts";
import { Category } from "../value-objects/category.ts";
import type { MenuItem } from "../entities/menu-item.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import type { CreateMenuItemUseCase } from "./create-menu-item.use-case.ts";

describe("CreateMenuItemUseCase", () => {
    let saved: MenuItem[];
    let create: CreateMenuItemUseCase;

    beforeEach(() => {
        saved = [];
        const container = new Container();
        container.load(domainModule);
        container.bind(TOKENS.MenuItemRepository).toConstantValue({
            save: (menuItem: MenuItem) => {
                saved.push(menuItem);
                return okAsync(menuItem);
            },
        } satisfies Partial<MenuItemRepository>);
        create = container.get<CreateMenuItemUseCase>(TOKENS.CreateMenuItemUseCase);
    });

    describe("adding to the menu", () => {
        it("stores the new item, available by default", async () => {
            const item = (
                await create.execute({
                    name: "Espresso",
                    category: Category.COFFEE,
                    description: "Short and strong",
                })
            )._unsafeUnwrap();

            expect(item).toMatchObject({
                name: "Espresso",
                category: Category.COFFEE,
                description: "Short and strong",
                available: true,
            });
            expect(saved).toEqual([item]);
        });

        it("refuses an empty name, storing nothing", async () => {
            const error = (
                await create.execute({ name: "", category: Category.COFFEE })
            )._unsafeUnwrapErr();

            expect(error.code).toBe("VALIDATION_ERROR");
            expect(saved).toEqual([]);
        });
    });
});

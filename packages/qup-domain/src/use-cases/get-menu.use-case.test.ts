import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import { MenuItem } from "../entities/menu-item.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import { Category } from "../value-objects/category.ts";
import { GetMenuUseCase } from "./get-menu.use-case.ts";

const makeMenuItem = () => {
    const result = MenuItem.create({ name: "Espresso", category: Category.COFFEE });
    if (result.isErr()) {
        throw new Error("unexpected");
    }
    return result.value;
};

describe("GetMenuUseCase", () => {
    it("returns all menu items by default", async () => {
        const item = makeMenuItem();
        const mockMenuItemRepo: MenuItemRepository = {
            save: vi.fn(),
            findById: vi.fn(),
            findAll: vi.fn(() => okAsync([item])),
            findAllAvailable: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };

        const useCase = new GetMenuUseCase(mockMenuItemRepo);
        const result = await useCase.execute();

        expect(result.isOk()).toBe(true);
        expect(mockMenuItemRepo.findAll).toHaveBeenCalled();
    });

    it("returns only available items when flag set", async () => {
        const item = makeMenuItem();
        const mockMenuItemRepo: MenuItemRepository = {
            save: vi.fn(),
            findById: vi.fn(),
            findAll: vi.fn(),
            findAllAvailable: vi.fn(() => okAsync([item])),
            update: vi.fn(),
            delete: vi.fn(),
        };

        const useCase = new GetMenuUseCase(mockMenuItemRepo);
        const result = await useCase.execute({ availableOnly: true });

        expect(result.isOk()).toBe(true);
        expect(mockMenuItemRepo.findAllAvailable).toHaveBeenCalled();
    });
});

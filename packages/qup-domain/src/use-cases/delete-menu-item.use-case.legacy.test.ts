import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { MenuItem } from "../entities/menu-item.ts";
import { Category } from "../value-objects/category.ts";
import { DeleteMenuItemUseCase } from "./delete-menu-item.use-case.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";

describe("DeleteMenuItemUseCase", () => {
    it("deletes an existing menu item", async () => {
        const item = MenuItem.create({ name: "Espresso", category: Category.COFFEE });
        if (item.isErr()) {
            throw new Error("unexpected");
        }

        const mockMenuItemRepo: MenuItemRepository = {
            save: vi.fn(),
            findById: vi.fn(() => okAsync(item.value)),
            findAll: vi.fn(),
            findAllAvailable: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(() => okAsync(undefined)),
        };

        const useCase = new DeleteMenuItemUseCase(mockMenuItemRepo);
        const result = await useCase.execute(item.value.id);

        expect(result.isOk()).toBe(true);
        expect(mockMenuItemRepo.delete).toHaveBeenCalledWith(item.value.id);
    });

    it("returns MenuItemNotFoundError for unknown id", async () => {
        const mockMenuItemRepo: MenuItemRepository = {
            save: vi.fn(),
            findById: vi.fn(() => okAsync(null)),
            findAll: vi.fn(),
            findAllAvailable: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };

        const useCase = new DeleteMenuItemUseCase(mockMenuItemRepo);
        const result = await useCase.execute("unknown");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("MENU_ITEM_NOT_FOUND");
        }
    });
});

import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import { MenuItem } from "../entities/menu-item.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import { Category } from "../value-objects/category.ts";
import { UpdateMenuItemUseCase } from "./update-menu-item.use-case.ts";

describe("UpdateMenuItemUseCase", () => {
    it("updates an existing menu item", async () => {
        const item = MenuItem.create({ name: "Espresso", category: Category.COFFEE });
        if (item.isErr()) {
            throw new Error("unexpected");
        }

        const mockMenuItemRepo: MenuItemRepository = {
            save: vi.fn(),
            findById: vi.fn(() => okAsync(item.value)),
            findAll: vi.fn(),
            findAllAvailable: vi.fn(),
            update: vi.fn(() => okAsync(undefined)),
            delete: vi.fn(),
        };

        const useCase = new UpdateMenuItemUseCase(mockMenuItemRepo);
        const result = await useCase.execute(item.value.id, { name: "Double Espresso" });

        expect(result.isOk()).toBe(true);
        expect(mockMenuItemRepo.update).toHaveBeenCalled();
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

        const useCase = new UpdateMenuItemUseCase(mockMenuItemRepo);
        const result = await useCase.execute("unknown", { name: "New Name" });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("MENU_ITEM_NOT_FOUND");
        }
    });

    it("returns ValidationError for empty name", async () => {
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
            delete: vi.fn(),
        };

        const useCase = new UpdateMenuItemUseCase(mockMenuItemRepo);
        const result = await useCase.execute(item.value.id, { name: "" });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("VALIDATION_ERROR");
        }
    });
});

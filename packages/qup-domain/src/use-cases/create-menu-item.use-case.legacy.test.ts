import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { Category } from "../value-objects/category.ts";
import { CreateMenuItemUseCase } from "./create-menu-item.use-case.ts";
import type { MenuItem } from "../entities/menu-item.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";

describe("CreateMenuItemUseCase", () => {
    it("creates and persists a menu item", async () => {
        const mockMenuItemRepo: MenuItemRepository = {
            save: vi.fn((item: MenuItem) => okAsync(item)),
            findById: vi.fn(),
            findAll: vi.fn(),
            findAllAvailable: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };

        const useCase = new CreateMenuItemUseCase(mockMenuItemRepo);
        const result = await useCase.execute({
            name: "Espresso",
            category: Category.COFFEE,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value.name).toBe("Espresso");
            expect(mockMenuItemRepo.save).toHaveBeenCalled();
        }
    });

    it("returns ValidationError for empty name", async () => {
        const mockMenuItemRepo: MenuItemRepository = {
            save: vi.fn(),
            findById: vi.fn(),
            findAll: vi.fn(),
            findAllAvailable: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };

        const useCase = new CreateMenuItemUseCase(mockMenuItemRepo);
        const result = await useCase.execute({
            name: "",
            category: Category.COFFEE,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("VALIDATION_ERROR");
        }
    });
});

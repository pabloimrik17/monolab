import { inject, injectable } from "inversify";
import { type ResultAsync, errAsync } from "neverthrow";

import { MenuItem } from "../entities/menu-item.ts";
import type { PersistenceError, ValidationError } from "../errors.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import { TOKENS } from "../tokens.ts";
import type { Category } from "../value-objects/category.ts";

@injectable()
export class CreateMenuItemUseCase {
    constructor(
        @inject(TOKENS.MenuItemRepository) private readonly menuItemRepo: MenuItemRepository,
    ) {}

    execute(props: {
        name: string;
        category: Category;
        description?: string;
        available?: boolean;
        sortOrder?: number;
    }): ResultAsync<MenuItem, ValidationError | PersistenceError> {
        const result = MenuItem.create(props);
        if (result.isErr()) {
            return errAsync(result.error);
        }
        return this.menuItemRepo.save(result.value);
    }
}

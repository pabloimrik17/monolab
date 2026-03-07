import { inject, injectable } from "inversify";
import { type ResultAsync, errAsync } from "neverthrow";

import type {
    MenuItemNotFoundError,
    PersistenceError,
    ValidationError,
} from "../errors.ts";
import { MenuItemNotFoundError as MenuItemNotFoundErrorClass } from "../errors.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import { TOKENS } from "../tokens.ts";
import type { Category } from "../value-objects/category.ts";

@injectable()
export class UpdateMenuItemUseCase {
    constructor(
        @inject(TOKENS.MenuItemRepository) private readonly menuItemRepo: MenuItemRepository,
    ) {}

    execute(
        id: string,
        props: {
            name?: string;
            category?: Category;
            description?: string;
            available?: boolean;
            sortOrder?: number;
        },
    ): ResultAsync<void, MenuItemNotFoundError | ValidationError | PersistenceError> {
        return this.menuItemRepo.findById(id).andThen((menuItem) => {
            if (!menuItem) {
                return errAsync(new MenuItemNotFoundErrorClass(id));
            }

            const updateResult = menuItem.update(props);
            if (updateResult.isErr()) {
                return errAsync(updateResult.error);
            }

            return this.menuItemRepo.update(menuItem);
        });
    }
}

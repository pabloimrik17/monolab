import { inject, injectable } from "inversify";
import { type ResultAsync, errAsync } from "neverthrow";

import type { MenuItemNotFoundError, PersistenceError } from "../errors.ts";
import { MenuItemNotFoundError as MenuItemNotFoundErrorClass } from "../errors.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import { TOKENS } from "../tokens.ts";

@injectable()
export class DeleteMenuItemUseCase {
    constructor(
        @inject(TOKENS.MenuItemRepository) private readonly menuItemRepo: MenuItemRepository,
    ) {}

    execute(id: string): ResultAsync<void, MenuItemNotFoundError | PersistenceError> {
        return this.menuItemRepo.findById(id).andThen((menuItem) => {
            if (!menuItem) {
                return errAsync(new MenuItemNotFoundErrorClass(id));
            }
            return this.menuItemRepo.delete(id);
        });
    }
}

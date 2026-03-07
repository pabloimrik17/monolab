import { inject, injectable } from "inversify";
import type { ResultAsync } from "neverthrow";

import type { MenuItem } from "../entities/menu-item.ts";
import type { PersistenceError } from "../errors.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import { TOKENS } from "../tokens.ts";

@injectable()
export class GetMenuUseCase {
    constructor(
        @inject(TOKENS.MenuItemRepository) private readonly menuItemRepo: MenuItemRepository,
    ) {}

    execute(options?: { availableOnly?: boolean }): ResultAsync<MenuItem[], PersistenceError> {
        if (options?.availableOnly) {
            return this.menuItemRepo.findAllAvailable();
        }
        return this.menuItemRepo.findAll();
    }
}

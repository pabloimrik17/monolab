import type { ResultAsync } from "neverthrow";

import type { MenuItem } from "../entities/menu-item.ts";
import type { PersistenceError } from "../errors.ts";

export interface MenuItemRepository {
    save(menuItem: MenuItem): ResultAsync<MenuItem, PersistenceError>;
    findById(id: string): ResultAsync<MenuItem | null, PersistenceError>;
    findAll(): ResultAsync<MenuItem[], PersistenceError>;
    findAllAvailable(): ResultAsync<MenuItem[], PersistenceError>;
    update(menuItem: MenuItem): ResultAsync<void, PersistenceError>;
    delete(id: string): ResultAsync<void, PersistenceError>;
}

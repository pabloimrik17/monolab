import type { PortfolioItem } from "../entities/portfolio-item.ts";
import type { PersistenceError, PortfolioItemConflictError } from "../errors.ts";
import type { ResultAsync } from "neverthrow";

// `E` defaults to the server-side failure; HTTP implementations widen it (NotFound, Network, ...).
export interface PortfolioItemRepository<E extends Error = PersistenceError> {
    save(item: PortfolioItem): ResultAsync<PortfolioItem, E>;
    findById(id: string): ResultAsync<PortfolioItem | null, E>;
    findAll(): ResultAsync<PortfolioItem[], E>;
    // Optimistic lock: fails with a conflict unless the stored row still carries `expectedUpdatedAt`.
    update(
        item: PortfolioItem,
        expectedUpdatedAt: Date,
    ): ResultAsync<PortfolioItem, E | PortfolioItemConflictError>;
    delete(id: string): ResultAsync<void, E>;
}

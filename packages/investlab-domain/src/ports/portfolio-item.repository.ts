import type { PortfolioItem } from "../entities/portfolio-item.ts";
import type { PersistenceError } from "../errors.ts";
import type { ResultAsync } from "neverthrow";

// `E` defaults to the server-side failure; HTTP implementations widen it (NotFound, Network, ...).
export interface PortfolioItemRepository<E extends Error = PersistenceError> {
    save(item: PortfolioItem): ResultAsync<PortfolioItem, E>;
    findById(id: string): ResultAsync<PortfolioItem | null, E>;
    findAll(): ResultAsync<PortfolioItem[], E>;
    update(item: PortfolioItem): ResultAsync<PortfolioItem, E>;
    delete(id: string): ResultAsync<void, E>;
}

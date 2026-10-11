import type { PortfolioItem } from "../entities/portfolio-item.ts";
import type { PersistenceError } from "../errors.ts";
import type { ResultAsync } from "neverthrow";

export interface PortfolioItemRepository {
    save(item: PortfolioItem): ResultAsync<PortfolioItem, PersistenceError>;
    findById(id: string): ResultAsync<PortfolioItem | null, PersistenceError>;
    findAll(): ResultAsync<PortfolioItem[], PersistenceError>;
    findByInstrumentId(instrumentId: string): ResultAsync<PortfolioItem[], PersistenceError>;
    update(item: PortfolioItem): ResultAsync<PortfolioItem, PersistenceError>;
    delete(id: string): ResultAsync<void, PersistenceError>;
}

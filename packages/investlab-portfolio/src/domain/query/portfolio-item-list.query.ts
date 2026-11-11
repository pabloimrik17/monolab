import type { PortfolioItemList } from "#domain/read-model/portfolio-item-list.read-model.ts";
import type { ResultAsync } from "neverthrow";

/** Reads the items and the instrument catalog in one call, where the source serves them together. */
export interface PortfolioItemListQuery<E extends Error> {
    list(): ResultAsync<PortfolioItemList, E>;
}

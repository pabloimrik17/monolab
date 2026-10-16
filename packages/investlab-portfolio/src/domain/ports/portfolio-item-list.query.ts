import type { PortfolioItemList } from "../read-models/portfolio-item-list.ts";
import type { ResultAsync } from "neverthrow";

/** Reads the items and the instrument catalog in one call, where the source serves them together. */
export interface PortfolioItemListQuery<E extends Error> {
    list(): ResultAsync<PortfolioItemList, E>;
}

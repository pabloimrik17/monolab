import type { PortfolioItemWithInstrument } from "#domain/read-model/portfolio-item-with-instrument.read-model.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

export interface PortfolioItemQuery<E extends Error = PersistenceError> {
    /** Every portfolio item paired with its instrument, ordered by item `createdAt` ascending. */
    listWithInstruments(): ResultAsync<PortfolioItemWithInstrument[], E>;
}

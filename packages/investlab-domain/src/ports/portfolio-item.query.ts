import type { PersistenceError } from "../errors.ts";
import type { PortfolioItemWithInstrument } from "../read-models/portfolio-item-with-instrument.ts";
import type { ResultAsync } from "neverthrow";

export interface PortfolioItemQuery<E extends Error = PersistenceError> {
    /** Every portfolio item paired with its instrument, ordered by item `createdAt` ascending. */
    listWithInstruments(): ResultAsync<PortfolioItemWithInstrument[], E>;
}

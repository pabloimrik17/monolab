import type { Instrument } from "#domain/model/instrument.model.ts";
import type { PortfolioItemWithInstrument } from "./portfolio-item-with-instrument.read-model.ts";

/** The portfolio screen's data: every item with its instrument, plus the catalog to pick from. */
export interface PortfolioItemList {
    items: PortfolioItemWithInstrument[];
    instruments: Instrument[];
}

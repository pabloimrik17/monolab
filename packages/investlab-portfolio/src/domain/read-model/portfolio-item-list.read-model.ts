import type { PortfolioItemWithInstrument } from "./portfolio-item-with-instrument.read-model.ts";
import type { Instrument } from "@m0n0lab/investlab-catalog";

/** The portfolio screen's data: every item with its instrument, plus the catalog to pick from. */
export interface PortfolioItemList {
    items: PortfolioItemWithInstrument[];
    instruments: Instrument[];
}

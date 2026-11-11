import type { PortfolioItem } from "#domain/model/portfolio-item.model.ts";
import type { Instrument } from "@m0n0lab/investlab-catalog";

export interface PortfolioItemWithInstrument {
    item: PortfolioItem;
    instrument: Instrument;
}

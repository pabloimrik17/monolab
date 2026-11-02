import type { Instrument } from "#domain/model/instrument.model.ts";
import type { PortfolioItem } from "#domain/model/portfolio-item.model.ts";

export interface PortfolioItemWithInstrument {
    item: PortfolioItem;
    instrument: Instrument;
}

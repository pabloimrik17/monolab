import type { Instrument } from "../entities/instrument.ts";
import type { PortfolioItem } from "../entities/portfolio-item.ts";

export interface PortfolioItemWithInstrument {
    item: PortfolioItem;
    instrument: Instrument;
}

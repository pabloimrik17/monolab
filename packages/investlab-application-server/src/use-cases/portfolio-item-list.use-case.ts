import { inject, injectable } from "inversify";
import { ResultAsync } from "neverthrow";
import {
    TOKENS,
    type Instrument,
    type InstrumentRepository,
    type PortfolioItemQuery,
    type PortfolioItemWithInstrument,
} from "@m0n0lab/investlab-domain";
import type { PersistenceError } from "@m0n0lab/investlab-core";

export interface PortfolioItemList {
    items: PortfolioItemWithInstrument[];
    instruments: Instrument[];
}

export type PortfolioItemListError = PersistenceError;

@injectable()
export class PortfolioItemListUseCase {
    constructor(
        @inject(TOKENS.PortfolioItemQuery)
        private readonly portfolioItemQuery: PortfolioItemQuery,
        @inject(TOKENS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository,
    ) {}

    execute(): ResultAsync<PortfolioItemList, PortfolioItemListError> {
        return ResultAsync.combine([
            this.portfolioItemQuery.listWithInstruments(),
            this.instrumentRepo.findAll(),
        ] as const).map(([items, instruments]) => ({ items, instruments }));
    }
}

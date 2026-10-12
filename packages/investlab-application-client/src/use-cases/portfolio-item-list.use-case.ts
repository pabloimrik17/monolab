import { inject, injectable } from "inversify";
import { ResultAsync } from "neverthrow";
import {
    TOKENS,
    type Instrument,
    type InstrumentRepository,
    type PortfolioItemQuery,
    type PortfolioItemWithInstrument,
} from "@m0n0lab/investlab-domain";
import type { ClientPortError } from "../client-port-error.ts";

export interface PortfolioItemList {
    items: PortfolioItemWithInstrument[];
    instruments: Instrument[];
}

export type PortfolioItemListError = ClientPortError;

@injectable()
export class PortfolioItemListUseCase {
    constructor(
        @inject(TOKENS.PortfolioItemQuery)
        private readonly portfolioItemQuery: PortfolioItemQuery<ClientPortError>,
        @inject(TOKENS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository<ClientPortError>,
    ) {}

    execute(): ResultAsync<PortfolioItemList, PortfolioItemListError> {
        return ResultAsync.combine([
            this.portfolioItemQuery.listWithInstruments(),
            this.instrumentRepo.findAll(),
        ] as const).map(([items, instruments]) => ({ items, instruments }));
    }
}

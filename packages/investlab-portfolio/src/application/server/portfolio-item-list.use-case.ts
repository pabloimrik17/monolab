import { inject, injectable } from "inversify";
import { ResultAsync } from "neverthrow";
import { PORTFOLIO_PORTS } from "./tokens.ts";
import type { Instrument } from "../../domain/entities/instrument.ts";
import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";
import type { PortfolioItemQuery } from "../../domain/ports/portfolio-item.query.ts";
import type { PortfolioItemWithInstrument } from "../../domain/read-models/portfolio-item-with-instrument.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";

export interface PortfolioItemList {
    items: PortfolioItemWithInstrument[];
    instruments: Instrument[];
}

export type PortfolioItemListError = PersistenceError;

@injectable()
export class PortfolioItemListUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.PortfolioItemQuery)
        private readonly portfolioItemQuery: PortfolioItemQuery,
        @inject(PORTFOLIO_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository,
    ) {}

    execute(): ResultAsync<PortfolioItemList, PortfolioItemListError> {
        return ResultAsync.combine([
            this.portfolioItemQuery.listWithInstruments(),
            this.instrumentRepo.findAll(),
        ] as const).map(([items, instruments]) => ({ items, instruments }));
    }
}

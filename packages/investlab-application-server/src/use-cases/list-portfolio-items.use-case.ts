import { inject, injectable } from "inversify";
import { ResultAsync } from "neverthrow";
import {
    TOKENS,
    type Instrument,
    type InstrumentRepository,
    type PersistenceError,
    type PortfolioItem,
    type PortfolioItemRepository,
} from "@m0n0lab/investlab-domain";

export interface PortfolioItemWithInstrument {
    item: PortfolioItem;
    instrument: Instrument;
}

@injectable()
export class ListPortfolioItemsUseCase {
    constructor(
        @inject(TOKENS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository,
        @inject(TOKENS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository,
    ) {}

    execute(): ResultAsync<PortfolioItemWithInstrument[], PersistenceError> {
        return this.portfolioItemRepo.findAll().andThen((items) => {
            if (items.length === 0) {
                return ResultAsync.fromSafePromise(Promise.resolve([]));
            }
            return this.instrumentRepo.findAll().map((instruments) => {
                const instrumentMap = new Map(instruments.map((i) => [i.id, i]));
                return items
                    .filter((item) => instrumentMap.has(item.instrumentId))
                    .map((item) => ({
                        item,
                        instrument: instrumentMap.get(item.instrumentId)!,
                    }));
            });
        });
    }
}

import { inject, injectable } from "inversify";
import { QUOTES_PORTS } from "#application/server/tokens.ts";
import type { MarketDataUnavailableError } from "#domain/error/market-data-unavailable.error.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { Quote } from "#domain/value-object/quote.value-object.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

export type QuoteGetError = PersistenceError | MarketDataUnavailableError;

@injectable()
export class QuoteGetUseCase {
    constructor(
        @inject(QUOTES_PORTS.QuoteRepository)
        private readonly quoteRepo: QuoteRepository<QuoteGetError>,
    ) {}

    execute(symbol: string): ResultAsync<Quote | undefined, QuoteGetError> {
        return this.quoteRepo.getQuote(symbol);
    }
}

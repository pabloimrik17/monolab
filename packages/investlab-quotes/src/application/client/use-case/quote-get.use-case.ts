import { inject, injectable } from "inversify";
import { QUOTES_PORTS } from "#application/client/tokens.ts";
import type { QuotesRemoteError } from "#domain/error/quotes-remote.error.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { Quote } from "#domain/value-object/quote.value-object.ts";
import type { ResultAsync } from "neverthrow";

export type QuoteGetError = QuotesRemoteError;

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

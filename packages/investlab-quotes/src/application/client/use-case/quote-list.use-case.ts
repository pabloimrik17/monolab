import { inject, injectable } from "inversify";
import { QUOTES_PORTS } from "#application/client/tokens.ts";
import type { QuotesRemoteError } from "#domain/error/quotes-remote.error.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { Quote } from "#domain/value-object/quote.value-object.ts";
import type { ResultAsync } from "neverthrow";

export type QuoteListError = QuotesRemoteError;

@injectable()
export class QuoteListUseCase {
    constructor(
        @inject(QUOTES_PORTS.QuoteRepository)
        private readonly quoteRepo: QuoteRepository<QuoteListError>,
    ) {}

    execute(symbols: string[]): ResultAsync<Quote[], QuoteListError> {
        return this.quoteRepo.getQuotes(symbols).map((quotes) => [...quotes.values()]);
    }
}

import { inject, injectable } from "inversify";
import { QUOTES_PORTS } from "#application/server/tokens.ts";
import type { QuotesServerError } from "#domain/error/quotes-server.error.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { Quote } from "#domain/value-object/quote.value-object.ts";
import type { ResultAsync } from "neverthrow";

export type QuoteGetError = QuotesServerError;

@injectable()
export class QuoteGetUseCase {
    constructor(
        @inject(QUOTES_PORTS.QuoteRepository)
        private readonly quoteRepo: QuoteRepository,
    ) {}

    execute(symbol: string): ResultAsync<Quote | undefined, QuoteGetError> {
        return this.quoteRepo.getQuote(symbol);
    }
}

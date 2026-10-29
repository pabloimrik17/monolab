import { inject, injectable } from "inversify";
import { QUOTES_PORTS } from "#application/server/tokens.ts";
import type { Quote } from "#domain/model/quote.model.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

export type QuoteListError = PersistenceError;

@injectable()
export class QuoteListUseCase {
    constructor(
        @inject(QUOTES_PORTS.QuoteRepository)
        private readonly quoteRepo: QuoteRepository,
    ) {}

    execute(symbols: string[]): ResultAsync<Quote[], QuoteListError> {
        return this.quoteRepo.getQuotes(symbols).map((quotes) => [...quotes.values()]);
    }
}

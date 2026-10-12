import { inject, injectable } from "inversify";
import {
    TOKENS,
    type PersistenceError,
    type Quote,
    type QuoteRepository,
} from "@m0n0lab/investlab-domain";
import type { ResultAsync } from "neverthrow";

export type QuoteListError = PersistenceError;

@injectable()
export class QuoteListUseCase {
    constructor(
        @inject(TOKENS.QuoteRepository)
        private readonly quoteRepo: QuoteRepository,
    ) {}

    execute(symbols: string[]): ResultAsync<Quote[], QuoteListError> {
        return this.quoteRepo.getQuotes(symbols).map((quotes) => [...quotes.values()]);
    }
}

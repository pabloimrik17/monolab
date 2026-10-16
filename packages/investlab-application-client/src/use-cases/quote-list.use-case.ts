import { inject, injectable } from "inversify";
import {
    TOKENS,
    type Quote,
    type QuoteRepository,
    type RemotePortError,
} from "@m0n0lab/investlab-domain";
import type { ResultAsync } from "neverthrow";

export type QuoteListError = RemotePortError;

@injectable()
export class QuoteListUseCase {
    constructor(
        @inject(TOKENS.QuoteRepository)
        private readonly quoteRepo: QuoteRepository<RemotePortError>,
    ) {}

    execute(symbols: string[]): ResultAsync<Quote[], QuoteListError> {
        return this.quoteRepo.getQuotes(symbols).map((quotes) => [...quotes.values()]);
    }
}

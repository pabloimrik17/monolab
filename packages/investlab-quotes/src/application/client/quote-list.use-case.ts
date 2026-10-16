import { inject, injectable } from "inversify";
import { QUOTES_PORTS } from "./tokens.ts";
import type { Quote, QuoteRepository } from "../../domain/quote.ts";
import type { RemotePortError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

/** Quotes have no module errors: only the failures every remote port can return. */
export type QuoteListError = RemotePortError;

@injectable()
export class QuoteListUseCase {
    constructor(
        @inject(QUOTES_PORTS.QuoteRepository)
        private readonly quoteRepo: QuoteRepository<RemotePortError>,
    ) {}

    execute(symbols: string[]): ResultAsync<Quote[], QuoteListError> {
        return this.quoteRepo.getQuotes(symbols).map((quotes) => [...quotes.values()]);
    }
}

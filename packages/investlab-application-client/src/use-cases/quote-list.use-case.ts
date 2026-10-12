import { inject, injectable } from "inversify";
import { TOKENS, type Quote, type QuoteRepository } from "@m0n0lab/investlab-domain";
import type { ClientPortError } from "../client-port-error.ts";
import type { ResultAsync } from "neverthrow";

export type QuoteListError = ClientPortError;

@injectable()
export class QuoteListUseCase {
    constructor(
        @inject(TOKENS.QuoteRepository)
        private readonly quoteRepo: QuoteRepository<ClientPortError>,
    ) {}

    execute(symbols: string[]): ResultAsync<Quote[], QuoteListError> {
        return this.quoteRepo.getQuotes(symbols).map((quotes) => [...quotes.values()]);
    }
}

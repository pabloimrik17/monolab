// fallow-ignore-file unused-class-member -- port impl bound in DI, consumed by application-client use cases (task 11.2)
import { inject, injectable } from "inversify";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { z } from "zod";
import { PersistenceError } from "@m0n0lab/investlab-core";
import { quoteDtoSchema } from "@m0n0lab/investlab-data-contracts";
import {
    type Quote,
    type QuoteRepository,
    type PortfolioRemoteError,
} from "@m0n0lab/investlab-domain";
import { ApiClient } from "../api-client.ts";

const quoteListSchema = z.array(quoteDtoSchema);

@injectable()
export class HttpQuoteRepository implements QuoteRepository<PortfolioRemoteError> {
    constructor(@inject(ApiClient) private readonly api: ApiClient) {}

    getQuote(symbol: string): ResultAsync<Quote, PortfolioRemoteError> {
        return this.getQuotes([symbol]).andThen((quotes) => {
            const quote = quotes.get(symbol);
            return quote
                ? okAsync(quote)
                : errAsync(new PersistenceError(`No quote returned for ${symbol}`));
        });
    }

    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, PortfolioRemoteError> {
        if (symbols.length === 0) {
            return okAsync(new Map());
        }
        return this.api
            .json(
                "GET",
                `/quotes?symbols=${encodeURIComponent(symbols.join(","))}`,
                quoteListSchema,
            )
            .map(
                (dtos) =>
                    new Map(
                        dtos.map((dto) => [
                            dto.symbol,
                            { ...dto, updatedAt: new Date(dto.updatedAt) },
                        ]),
                    ),
            );
    }
}

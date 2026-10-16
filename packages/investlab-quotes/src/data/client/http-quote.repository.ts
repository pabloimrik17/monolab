import { inject, injectable } from "inversify";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { z } from "zod";
import { PersistenceError, type RemotePortError } from "@m0n0lab/investlab-core";
import { PLATFORM, type InvestlabApiClient } from "@m0n0lab/investlab-platform/client";
import { quoteDtoSchema } from "../contracts/quote.dto.ts";
import type { Quote, QuoteRepository } from "../../domain/quote.ts";

const quoteListSchema = z.array(quoteDtoSchema);

/** A cold cache makes the API fetch up to 50 symbols from Finnhub in sequential groups of 10, each call allowed 10s. */
const QUOTES_TIMEOUT_MS = 60_000;

@injectable()
export class HttpQuoteRepository implements QuoteRepository<RemotePortError> {
    constructor(@inject(PLATFORM.InvestlabApiClient) private readonly api: InvestlabApiClient) {}

    getQuote(symbol: string): ResultAsync<Quote, RemotePortError> {
        return this.getQuotes([symbol]).andThen((quotes) => {
            const quote = quotes.get(symbol);
            return quote
                ? okAsync(quote)
                : errAsync(new PersistenceError(`No quote returned for ${symbol}`));
        });
    }

    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, RemotePortError> {
        if (symbols.length === 0) {
            return okAsync(new Map());
        }
        return this.api
            .json(
                "GET",
                `/quotes?symbols=${encodeURIComponent(symbols.join(","))}`,
                quoteListSchema,
                { timeoutMs: QUOTES_TIMEOUT_MS },
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

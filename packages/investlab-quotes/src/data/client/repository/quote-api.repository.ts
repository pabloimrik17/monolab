import { inject, injectable } from "inversify";
import { okAsync, type ResultAsync } from "neverthrow";
import { z } from "zod";
import { quoteDtoSchema } from "#data/shared/dto/quote.dto.ts";
import { MarketDataUnavailableError } from "#domain/error/market-data-unavailable.error.ts";
import { PLATFORM, type InvestlabApiClient } from "@m0n0lab/investlab-platform/client";
import type { QuotesRemoteError } from "#domain/error/quotes-remote.error.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { Quote } from "#domain/value-object/quote.value-object.ts";

const quoteListSchema = z.array(quoteDtoSchema);

/** A cold cache makes the API fetch up to 50 symbols from Finnhub in sequential groups of 10, each call allowed 10s. */
const QUOTES_TIMEOUT_MS = 60_000;

@injectable()
export class QuoteApiRepository implements QuoteRepository<QuotesRemoteError> {
    constructor(@inject(PLATFORM.InvestlabApiClient) private readonly api: InvestlabApiClient) {}

    getQuote(symbol: string): ResultAsync<Quote | undefined, QuotesRemoteError> {
        return this.getQuotes([symbol]).map((quotes) => quotes.get(symbol));
    }

    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, QuotesRemoteError> {
        if (symbols.length === 0) {
            return okAsync(new Map());
        }

        return this.api
            .json(
                "GET",
                `/quotes?symbols=${encodeURIComponent(symbols.join(","))}`,
                quoteListSchema,
                {
                    timeoutMs: QUOTES_TIMEOUT_MS,
                    errors: {
                        MARKET_DATA_UNAVAILABLE: (dto) => new MarketDataUnavailableError(dto),
                    },
                },
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

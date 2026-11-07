import { inject, injectable } from "inversify";
import { err, ok, type Result, type ResultAsync } from "neverthrow";
import { QUOTES_DATA } from "#data/server/tokens.ts";
import type {
    FinnhubAuthError,
    FinnhubClient,
    FinnhubQuoteResponse,
    FinnhubUpstreamError,
} from "#data/server/infra/http/finnhub.client.ts";
import type { Quote } from "#domain/value-object/quote.value-object.ts";

/** Finnhub answered but knows nothing of the symbol: not an upstream failure. */
class NoQuoteDataError extends Error {
    readonly code = "NO_QUOTE_DATA";
    constructor(symbol: string) {
        super(`No data for symbol: ${symbol}`);
        this.name = "NoQuoteDataError";
    }
}

/** The quotes Finnhub had, and the symbols it failed to answer with why. */
export interface FinnhubQuoteFetch {
    readonly quotes: ReadonlyMap<string, Quote>;
    readonly failures: ReadonlyMap<string, FinnhubUpstreamError>;
}

function toQuote(
    symbol: string,
    { c, d, dp }: FinnhubQuoteResponse,
): Result<Quote, NoQuoteDataError> {
    // Finnhub answers unknown symbols with an empty quote (`c: 0`, `d`/`dp` null).
    if (c === 0 || d == null || dp == null) {
        return err(new NoQuoteDataError(symbol));
    }

    return ok({ symbol, price: c, change: d, changePercent: dp, updatedAt: new Date() });
}

@injectable()
export class QuoteFinnhubDatasource {
    constructor(@inject(QUOTES_DATA.FinnhubClient) private readonly finnhub: FinnhubClient) {}

    /** Symbols Finnhub has no data for are left out; every symbol left out is logged. */
    getQuotes(symbols: string[]): ResultAsync<FinnhubQuoteFetch, FinnhubAuthError> {
        return this.finnhub
            .getQuotes(symbols.map((s) => s.toUpperCase()))
            .map(({ responses, failures }) => {
                const quotes = new Map<string, Quote>();
                for (const [symbol, response] of responses) {
                    const quote = toQuote(symbol, response);
                    if (quote.isOk()) {
                        quotes.set(symbol, quote.value);
                    } else {
                        console.error(`[QuoteFinnhubDatasource] ${quote.error.message}`);
                    }
                }
                for (const [symbol, failure] of failures) {
                    console.error(
                        `[QuoteFinnhubDatasource] ${symbol} failed upstream: ${failure.name}: ${failure.message}`,
                    );
                }
                return { quotes, failures };
            });
    }
}

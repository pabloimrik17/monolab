import { inject, injectable } from "inversify";
import { QUOTES_DATA } from "#data/server/tokens.ts";
import type {
    FinnhubClient,
    FinnhubQuoteResponse,
} from "#data/server/infra/http/finnhub.client.ts";
import type { Quote } from "#domain/model/quote.model.ts";

function toQuote(symbol: string, { c, d, dp }: FinnhubQuoteResponse): Quote {
    // Finnhub answers unknown symbols with an empty quote (`c: 0`, `d`/`dp` null).
    if (c === 0 || d == null || dp == null) {
        throw new Error(`No data for symbol: ${symbol}`);
    }
    return { symbol, price: c, change: d, changePercent: dp, updatedAt: new Date() };
}

@injectable()
export class QuoteFinnhubDatasource {
    constructor(@inject(QUOTES_DATA.FinnhubClient) private readonly finnhub: FinnhubClient) {}

    async getQuote(symbol: string): Promise<Quote> {
        const normalized = symbol.toUpperCase();
        return toQuote(normalized, await this.finnhub.getQuote(normalized));
    }

    async getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
        const responses = await this.finnhub.getQuotes(symbols.map((s) => s.toUpperCase()));
        const quotes = new Map<string, Quote>();
        for (const [symbol, response] of responses) {
            try {
                quotes.set(symbol, toQuote(symbol, response));
            } catch (err) {
                console.error(
                    `[QuoteFinnhubDatasource] ${symbol} failed:`,
                    err instanceof Error ? err.message : err,
                );
            }
        }
        return quotes;
    }
}

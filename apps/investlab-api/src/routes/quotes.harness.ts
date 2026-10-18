import { errAsync, okAsync } from "neverthrow";
import { QUOTES } from "@m0n0lab/investlab-quotes/server";
import { BaseApiHarness } from "../testing/base-api-harness.ts";
import type { Quote } from "@m0n0lab/investlab-quotes";
import type { QuoteListError } from "@m0n0lab/investlab-quotes/server";

/** `/quotes` over HTTP; each `given*` arranges the list use case and returns its recorder. */
export class QuotesHarness extends BaseApiHarness {
    givenQuotes(quotes: Quote[]) {
        return this.fake(QUOTES.List, okAsync(quotes));
    }

    givenQuotesFail(error: QuoteListError) {
        return this.fake(QUOTES.List, errAsync(error));
    }

    /** GET `/quotes?symbols=…`, or `/quotes` alone when `symbols` is omitted. */
    listQuotes(symbols?: string[]): Promise<Response> {
        const query = symbols ? `?symbols=${symbols.map(encodeURIComponent).join(",")}` : "";
        return this.request(`/quotes${query}`);
    }
}

import { okAsync } from "neverthrow";
import { ApiHarness } from "#core/harness/api.harness.ts";
import { quoteDtoSchema } from "@m0n0lab/investlab-quotes";
import { QUOTES } from "@m0n0lab/investlab-quotes/server";
import type { Quote } from "@m0n0lab/investlab-quotes";

export class QuoteRouteHarness extends ApiHarness {
    givenQuotes(quotes: Quote[]) {
        return this.fake(QUOTES.List, okAsync(quotes));
    }

    listQuotes(symbols?: string[]) {
        const query = symbols ? `?symbols=${symbols.map(encodeURIComponent).join(",")}` : "";
        return this.reply(this.request(`/quotes${query}`), quoteDtoSchema.array());
    }
}

import { okAsync } from "neverthrow";
import { quoteDtoSchema } from "@m0n0lab/investlab-quotes";
import { QUOTES } from "@m0n0lab/investlab-quotes/server";
import { BaseApiHarness } from "../testing/base-api-harness.ts";
import type { Quote } from "@m0n0lab/investlab-quotes";

export class QuotesHarness extends BaseApiHarness {
    givenQuotes(quotes: Quote[]) {
        return this.fake(QUOTES.List, okAsync(quotes));
    }

    listQuotes(symbols?: string[]) {
        const query = symbols ? `?symbols=${symbols.map(encodeURIComponent).join(",")}` : "";
        return this.reply(this.request(`/quotes${query}`), quoteDtoSchema.array());
    }
}

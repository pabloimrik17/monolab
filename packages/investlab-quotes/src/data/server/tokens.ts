import type { QuoteFinnhubDatasource } from "#data/server/datasource/quote-finnhub.datasource.ts";
import type { QuoteRedisDatasource } from "#data/server/datasource/quote-redis.datasource.ts";
import type { FinnhubClient } from "#data/server/infra/http/finnhub.client.ts";
import type { ServiceIdentifier } from "inversify";

/** Infra and datasources behind the cached quote repository; internal to the module, never exported. */
export const QUOTES_DATA = {
    FinnhubClient: Symbol.for(
        "investlab.quotes.server.FinnhubClient",
    ) as ServiceIdentifier<FinnhubClient>,
    QuoteFinnhubDatasource: Symbol.for(
        "investlab.quotes.server.QuoteFinnhubDatasource",
    ) as ServiceIdentifier<QuoteFinnhubDatasource>,
    QuoteRedisDatasource: Symbol.for(
        "investlab.quotes.server.QuoteRedisDatasource",
    ) as ServiceIdentifier<QuoteRedisDatasource>,
} as const;

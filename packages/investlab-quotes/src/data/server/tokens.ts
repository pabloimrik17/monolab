import type { FinnhubQuoteDatasource } from "./finnhub-quote.datasource.ts";
import type { RedisQuoteDatasource } from "./redis-quote.datasource.ts";
import type { ServiceIdentifier } from "inversify";

/** Datasources behind the cached quote repository; internal to the module, never exported. */
export const QUOTES_DATA = {
    FinnhubQuoteDatasource: Symbol.for(
        "investlab.quotes.server.FinnhubQuoteDatasource",
    ) as ServiceIdentifier<FinnhubQuoteDatasource>,
    RedisQuoteDatasource: Symbol.for(
        "investlab.quotes.server.RedisQuoteDatasource",
    ) as ServiceIdentifier<RedisQuoteDatasource>,
} as const;

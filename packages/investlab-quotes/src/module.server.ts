import { ContainerModule } from "inversify";
import { PLATFORM } from "@m0n0lab/investlab-platform/server";
import { QuoteListUseCase } from "./application/server/quote-list.use-case.ts";
import { QUOTES, QUOTES_PORTS } from "./application/server/tokens.ts";
import { CachedQuoteRepository } from "./data/server/cached-quote.repository.ts";
import { createFinnhubQuoteDatasource } from "./data/server/finnhub-quote.datasource.ts";
import { RedisQuoteDatasource } from "./data/server/redis-quote.datasource.ts";
import { QUOTES_DATA } from "./data/server/tokens.ts";

/** Quotes for the API: Redis cache in front of Finnhub. Requires `platformServerModule`. */
export const quotesServerModule = new ContainerModule(({ bind }) => {
    bind(QUOTES_DATA.FinnhubQuoteDatasource)
        .toDynamicValue((context) =>
            createFinnhubQuoteDatasource(
                context.get(PLATFORM.Config).finnhub.apiKey,
                context.get(PLATFORM.HttpClient),
            ),
        )
        .inSingletonScope();
    bind(QUOTES_DATA.RedisQuoteDatasource).to(RedisQuoteDatasource);
    bind(QUOTES_PORTS.QuoteRepository).to(CachedQuoteRepository);
    bind(QUOTES.List).to(QuoteListUseCase);
});

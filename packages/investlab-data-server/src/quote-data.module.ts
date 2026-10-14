import { ContainerModule } from "inversify";
import { TOKENS } from "@m0n0lab/investlab-domain";
import { PLATFORM } from "@m0n0lab/investlab-platform/server";
import { createFinnhubQuoteDatasource } from "./datasources/finnhub-quote.datasource.ts";
import { RedisQuoteDatasource } from "./datasources/redis-quote.datasource.ts";
import { CachedQuoteRepository } from "./repositories/cached-quote.repository.ts";
import { DATA_TOKENS } from "./tokens.ts";

/** Requires `platformServerModule` (and its `PLATFORM.Config`) loaded by the composition root. */
export const quoteDataModule = new ContainerModule(({ bind }) => {
    bind(DATA_TOKENS.FinnhubQuoteDatasource)
        .toDynamicValue((context) =>
            createFinnhubQuoteDatasource(
                context.get(PLATFORM.Config).finnhub.apiKey,
                context.get(PLATFORM.HttpClient),
            ),
        )
        .inSingletonScope();
    bind(DATA_TOKENS.RedisQuoteDatasource).to(RedisQuoteDatasource);
    bind(TOKENS.QuoteRepository).to(CachedQuoteRepository);
});

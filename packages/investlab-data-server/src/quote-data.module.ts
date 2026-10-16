import { ContainerModule } from "inversify";
import { TOKENS } from "@m0n0lab/investlab-domain";
import { RedisQuoteDatasource } from "./datasources/redis-quote.datasource.ts";
import { CachedQuoteRepository } from "./repositories/cached-quote.repository.ts";
import { DATA_TOKENS } from "./tokens.ts";

/** Requires `DATA_TOKENS.Redis` and `DATA_TOKENS.FinnhubQuoteDatasource` bound by the composition root. */
export const quoteDataModule = new ContainerModule(({ bind }) => {
    bind(DATA_TOKENS.RedisQuoteDatasource).to(RedisQuoteDatasource);
    bind(TOKENS.QuoteRepository).to(CachedQuoteRepository);
});

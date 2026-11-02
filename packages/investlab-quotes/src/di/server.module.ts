import { ContainerModule } from "inversify";
import { QUOTES, QUOTES_PORTS } from "#application/server/tokens.ts";
import { QuoteListUseCase } from "#application/server/use-case/quote-list.use-case.ts";
import { QuoteFinnhubDatasource } from "#data/server/datasource/quote-finnhub.datasource.ts";
import { QuoteRedisDatasource } from "#data/server/datasource/quote-redis.datasource.ts";
import { FinnhubClient } from "#data/server/infra/http/finnhub.client.ts";
import { QuoteCachedRepository } from "#data/server/repository/quote-cached.repository.ts";
import { QUOTES_DATA } from "#data/server/tokens.ts";
import { PLATFORM } from "@m0n0lab/investlab-platform/server";

/** Quotes for the API: Redis cache in front of Finnhub. Requires `platformServerModule`. */
export const quotesServerModule = new ContainerModule(({ bind }) => {
    bind(QUOTES_DATA.FinnhubClient)
        .toDynamicValue(
            (context) =>
                new FinnhubClient(
                    context.get(PLATFORM.Config).finnhub.apiKey,
                    context.get(PLATFORM.HttpClient),
                ),
        )
        .inSingletonScope();
    bind(QUOTES_DATA.QuoteFinnhubDatasource).to(QuoteFinnhubDatasource);
    bind(QUOTES_DATA.QuoteRedisDatasource).to(QuoteRedisDatasource);
    bind(QUOTES_PORTS.QuoteRepository).to(QuoteCachedRepository);
    bind(QUOTES.List).to(QuoteListUseCase);
});

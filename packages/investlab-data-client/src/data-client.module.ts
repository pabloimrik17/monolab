import { ContainerModule } from "inversify";
import { TOKENS } from "@m0n0lab/investlab-domain";
import { ApiClient } from "./api-client.ts";
import { HttpPortfolioItemQuery } from "./queries/http-portfolio-item.query.ts";
import { HttpInstrumentRepository } from "./repositories/http-instrument.repository.ts";
import { HttpPortfolioItemRepository } from "./repositories/http-portfolio-item.repository.ts";
import { HttpQuoteRepository } from "./repositories/http-quote.repository.ts";

/** Requires `DATA_CLIENT_TOKENS.ApiBaseUrl` and `DATA_CLIENT_TOKENS.ApiToken` bound by the composition root. */
export const dataClientModule = new ContainerModule(({ bind }) => {
    bind(ApiClient).toSelf().inSingletonScope();
    bind(TOKENS.InstrumentRepository).to(HttpInstrumentRepository);
    bind(TOKENS.PortfolioItemRepository).to(HttpPortfolioItemRepository);
    bind(TOKENS.PortfolioItemQuery).to(HttpPortfolioItemQuery);
    bind(TOKENS.QuoteRepository).to(HttpQuoteRepository);
});

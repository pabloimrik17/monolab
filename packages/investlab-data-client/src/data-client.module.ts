import { ContainerModule } from "inversify";
import { TOKENS } from "@m0n0lab/investlab-domain";
import { HttpPortfolioItemQuery } from "./queries/http-portfolio-item.query.ts";
import { HttpInstrumentRepository } from "./repositories/http-instrument.repository.ts";
import { HttpPortfolioItemRepository } from "./repositories/http-portfolio-item.repository.ts";
import { HttpQuoteRepository } from "./repositories/http-quote.repository.ts";

/** Requires `platformClientModule` (and its `PLATFORM.Config`) loaded by the composition root. */
export const dataClientModule = new ContainerModule(({ bind }) => {
    bind(TOKENS.InstrumentRepository).to(HttpInstrumentRepository);
    bind(TOKENS.PortfolioItemRepository).to(HttpPortfolioItemRepository);
    bind(TOKENS.PortfolioItemListQuery).to(HttpPortfolioItemQuery);
    bind(TOKENS.QuoteRepository).to(HttpQuoteRepository);
});

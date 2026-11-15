import { ContainerModule } from "inversify";
import { QUOTES, QUOTES_PORTS } from "#application/client/tokens.ts";
import { QuoteGetUseCase } from "#application/client/use-case/quote-get.use-case.ts";
import { QuoteListUseCase } from "#application/client/use-case/quote-list.use-case.ts";
import { QuoteApiRepository } from "#data/client/repository/quote-api.repository.ts";

/** Quotes for the web, through the InvestLab API. Requires `platformClientModule`. */
export const quotesClientModule = new ContainerModule(({ bind }) => {
    bind(QUOTES_PORTS.QuoteRepository).to(QuoteApiRepository);
    bind(QUOTES.Get).to(QuoteGetUseCase);
    bind(QUOTES.List).to(QuoteListUseCase);
});

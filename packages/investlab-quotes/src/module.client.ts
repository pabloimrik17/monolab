import { ContainerModule } from "inversify";
import { QuoteListUseCase } from "./application/client/quote-list.use-case.ts";
import { QUOTES, QUOTES_PORTS } from "./application/client/tokens.ts";
import { HttpQuoteRepository } from "./data/client/http-quote.repository.ts";

/** Quotes for the web, through the InvestLab API. Requires `platformClientModule`. */
export const quotesClientModule = new ContainerModule(({ bind }) => {
    bind(QUOTES_PORTS.QuoteRepository).to(HttpQuoteRepository);
    bind(QUOTES.List).to(QuoteListUseCase);
});

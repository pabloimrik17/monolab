import { ContainerModule } from "inversify";
import { QUOTES, QUOTES_PORTS } from "#application/client/tokens.ts";
import { TickerAddUseCase } from "#application/client/use-case/ticker-add.use-case.ts";
import { TickerListUseCase } from "#application/client/use-case/ticker-list.use-case.ts";
import { TickerRemoveUseCase } from "#application/client/use-case/ticker-remove.use-case.ts";
import { TickerStorageRepository } from "#data/client/repository/ticker-storage.repository.ts";

/** Followed tickers in the browser's storage. Requires `platformBrowserModule`. */
export const quotesBrowserModule = new ContainerModule(({ bind }) => {
    bind(QUOTES_PORTS.TickerRepository).to(TickerStorageRepository);
    bind(QUOTES.TickerList).to(TickerListUseCase);
    bind(QUOTES.TickerAdd).to(TickerAddUseCase);
    bind(QUOTES.TickerRemove).to(TickerRemoveUseCase);
});

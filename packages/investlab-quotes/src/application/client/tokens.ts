import type { QuoteListUseCase } from "#application/client/use-case/quote-list.use-case.ts";
import type { TickerAddUseCase } from "#application/client/use-case/ticker-add.use-case.ts";
import type { TickerListUseCase } from "#application/client/use-case/ticker-list.use-case.ts";
import type { TickerRemoveUseCase } from "#application/client/use-case/ticker-remove.use-case.ts";
import type { QuotesRemoteError } from "#domain/error/quotes-remote.error.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { TickerRepository } from "#domain/repository/ticker.repository.ts";
import type { ServiceIdentifier } from "inversify";

/** Client use cases of the quotes module. */
export const QUOTES = {
    List: Symbol.for("investlab.quotes.client.List") as ServiceIdentifier<QuoteListUseCase>,
    TickerList: Symbol.for(
        "investlab.quotes.client.TickerList",
    ) as ServiceIdentifier<TickerListUseCase>,
    TickerAdd: Symbol.for(
        "investlab.quotes.client.TickerAdd",
    ) as ServiceIdentifier<TickerAddUseCase>,
    TickerRemove: Symbol.for(
        "investlab.quotes.client.TickerRemove",
    ) as ServiceIdentifier<TickerRemoveUseCase>,
} as const;

/** Bound by the `di/` modules; never exported from the package. */
export const QUOTES_PORTS = {
    QuoteRepository: Symbol.for("investlab.quotes.client.QuoteRepository") as ServiceIdentifier<
        QuoteRepository<QuotesRemoteError>
    >,
    TickerRepository: Symbol.for(
        "investlab.quotes.client.TickerRepository",
    ) as ServiceIdentifier<TickerRepository>,
} as const;

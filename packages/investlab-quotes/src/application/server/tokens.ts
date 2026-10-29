import type { QuoteListUseCase } from "#application/server/use-case/quote-list.use-case.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { ServiceIdentifier } from "inversify";

/** Server use cases of the quotes module. */
export const QUOTES = {
    List: Symbol.for("investlab.quotes.server.List") as ServiceIdentifier<QuoteListUseCase>,
} as const;

/** Ports the server use cases depend on; bound by `module.server.ts`, never exported. */
export const QUOTES_PORTS = {
    QuoteRepository: Symbol.for(
        "investlab.quotes.server.QuoteRepository",
    ) as ServiceIdentifier<QuoteRepository>,
} as const;

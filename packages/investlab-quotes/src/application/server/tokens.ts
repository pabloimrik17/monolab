import type { QuoteListUseCase } from "#application/server/use-case/quote-list.use-case.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { ServiceIdentifier } from "inversify";

/** Server use cases of the quotes module. */
export const QUOTES = {
    List: Symbol.for("investlab.quotes.server.List") as ServiceIdentifier<QuoteListUseCase>,
} as const;

/** Bound by `di/server.module.ts`; never exported from the package. */
export const QUOTES_PORTS = {
    QuoteRepository: Symbol.for(
        "investlab.quotes.server.QuoteRepository",
    ) as ServiceIdentifier<QuoteRepository>,
} as const;

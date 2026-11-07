import type { QuoteGetUseCase } from "#application/server/use-case/quote-get.use-case.ts";
import type {
    QuoteListError,
    QuoteListUseCase,
} from "#application/server/use-case/quote-list.use-case.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { ServiceIdentifier } from "inversify";

/** Server use cases of the quotes module. */
export const QUOTES = {
    Get: Symbol.for("investlab.quotes.server.Get") as ServiceIdentifier<QuoteGetUseCase>,
    List: Symbol.for("investlab.quotes.server.List") as ServiceIdentifier<QuoteListUseCase>,
} as const;

/** Bound by `di/server.module.ts`; never exported from the package. */
export const QUOTES_PORTS = {
    QuoteRepository: Symbol.for("investlab.quotes.server.QuoteRepository") as ServiceIdentifier<
        QuoteRepository<QuoteListError>
    >,
} as const;

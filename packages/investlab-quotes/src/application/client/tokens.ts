import type { QuoteRepository } from "../../domain/quote.ts";
import type { QuoteListUseCase } from "./quote-list.use-case.ts";
import type { RemotePortError } from "@m0n0lab/investlab-core";
import type { ServiceIdentifier } from "inversify";

/** Client use cases of the quotes module. */
export const QUOTES = {
    List: Symbol.for("investlab.quotes.client.List") as ServiceIdentifier<QuoteListUseCase>,
} as const;

/** Ports the client use cases depend on; bound by `module.client.ts`, never exported. */
export const QUOTES_PORTS = {
    QuoteRepository: Symbol.for("investlab.quotes.client.QuoteRepository") as ServiceIdentifier<
        QuoteRepository<RemotePortError>
    >,
} as const;

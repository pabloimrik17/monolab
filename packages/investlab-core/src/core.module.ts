import { ContainerModule } from "inversify";
import { TOKENS } from "@m0n0lab/investlab-domain";
import { QuoteCacheImpl } from "./quote-cache-impl.ts";

export const coreModule = new ContainerModule(({ bind }) => {
    bind(TOKENS.QuoteRepository).to(QuoteCacheImpl);
});

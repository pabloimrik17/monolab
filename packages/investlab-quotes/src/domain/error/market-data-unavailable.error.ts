import { DomainError } from "@m0n0lab/investlab-core";

/** Market data could not be reached or kept failing, and nothing else could answer a quote. */
export class MarketDataUnavailableError extends DomainError<"MARKET_DATA_UNAVAILABLE"> {
    readonly code = "MARKET_DATA_UNAVAILABLE";
    constructor(cause: unknown) {
        super("Market data is unavailable");
        this.name = "MarketDataUnavailableError";
        this.cause = cause;
    }
}

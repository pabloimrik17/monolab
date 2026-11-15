import type { MarketDataUnavailableError } from "./market-data-unavailable.error.ts";
import type { RemotePortError } from "@m0n0lab/investlab-core";

/** Codes of the quotes module's own errors; the kernel codes live in core. */
export type QuotesErrorCode = "MARKET_DATA_UNAVAILABLE";

export type QuotesRemoteError = RemotePortError<MarketDataUnavailableError>;

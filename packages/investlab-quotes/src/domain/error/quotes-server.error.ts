import type { MarketDataUnavailableError } from "./market-data-unavailable.error.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";

export type QuotesServerError = PersistenceError | MarketDataUnavailableError;

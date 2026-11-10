import type {
    PortfolioItemConflictError,
    PortfolioItemNotFoundError,
} from "./portfolio-item.error.ts";
import type { InstrumentNotFoundError } from "@m0n0lab/investlab-catalog";
import type { RemotePortError } from "@m0n0lab/investlab-core";

/** Codes of the portfolio module's own errors; the kernel codes live in core. */
export type PortfolioErrorCode =
    | "INSTRUMENT_NOT_FOUND"
    | "PORTFOLIO_ITEM_NOT_FOUND"
    | "PORTFOLIO_ITEM_CONFLICT";

export type PortfolioRemoteError = RemotePortError<
    InstrumentNotFoundError | PortfolioItemNotFoundError | PortfolioItemConflictError
>;

import type { CatalogRemoteError } from "@m0n0lab/investlab-catalog";
import type { PortfolioRemoteError } from "@m0n0lab/investlab-portfolio";
import type { QuotesRemoteError } from "@m0n0lab/investlab-quotes";
import type { RogerRemoteError } from "@m0n0lab/investlab-roger";

type RemoteError = CatalogRemoteError | PortfolioRemoteError | QuotesRemoteError | RogerRemoteError;

/** What the user reads when a client use case fails; server-side details never reach the page. */
export function remoteErrorMessage(error: RemoteError): string {
    switch (error.code) {
        case "NETWORK_ERROR":
            return "InvestLab service is unavailable. Please try again later.";
        case "UNAUTHORIZED":
            return "API token is not accepted by investlab-api; check INVESTLAB_API_TOKEN";
        case "PERSISTENCE_ERROR":
            return "InvestLab could not complete the request. Please try again later.";
        case "MARKET_DATA_UNAVAILABLE":
            return "Quotes are unavailable right now. Please try again later.";
        case "VALIDATION_ERROR":
        case "INSTRUMENT_NOT_FOUND":
        case "INSTRUMENT_IN_USE":
        case "INSTRUMENT_ALREADY_EXISTS":
        case "PORTFOLIO_ITEM_NOT_FOUND":
        case "PORTFOLIO_ITEM_CONFLICT":
        case "ENTRY_NOT_FOUND":
        case "ENTRY_CONFLICT":
        case "INVALID_TRANSITION":
        case "MISSING_REQUIRED_FIELD":
        case "FIELD_NOT_IN_STATE":
            return error.message;
    }
}

/** HTTP status for a loader or resource route that fails with `error`. */
export function remoteErrorStatus(error: RemoteError): number {
    switch (error.code) {
        case "NETWORK_ERROR":
        case "MARKET_DATA_UNAVAILABLE":
            return 503;
        case "UNAUTHORIZED":
        case "PERSISTENCE_ERROR":
            return 500;
        case "VALIDATION_ERROR":
        case "MISSING_REQUIRED_FIELD":
        case "FIELD_NOT_IN_STATE":
            return 422;
        case "INSTRUMENT_NOT_FOUND":
        case "PORTFOLIO_ITEM_NOT_FOUND":
        case "ENTRY_NOT_FOUND":
            return 404;
        case "PORTFOLIO_ITEM_CONFLICT":
        case "ENTRY_CONFLICT":
        case "INVALID_TRANSITION":
        case "INSTRUMENT_IN_USE":
        case "INSTRUMENT_ALREADY_EXISTS":
            return 409;
    }
}

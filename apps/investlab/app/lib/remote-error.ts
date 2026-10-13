import type { RemotePortError } from "@m0n0lab/investlab-domain";

/** What the user reads when a client use case fails; server-side details never reach the page. */
export function remoteErrorMessage(error: RemotePortError): string {
    switch (error.code) {
        case "NETWORK_ERROR":
            return "InvestLab service is unavailable. Please try again later.";
        case "UNAUTHORIZED":
            return "API token is not accepted by investlab-api; check INVESTLAB_API_TOKEN";
        case "PERSISTENCE_ERROR":
            return "InvestLab could not complete the request. Please try again later.";
        case "VALIDATION_ERROR":
        case "INSTRUMENT_NOT_FOUND":
        case "PORTFOLIO_ITEM_NOT_FOUND":
            return error.message;
    }
}

/** HTTP status for a loader or resource route that fails with `error`. */
export function remoteErrorStatus(error: RemotePortError): number {
    switch (error.code) {
        case "NETWORK_ERROR":
            return 503;
        case "UNAUTHORIZED":
        case "PERSISTENCE_ERROR":
            return 500;
        case "VALIDATION_ERROR":
            return 422;
        case "INSTRUMENT_NOT_FOUND":
        case "PORTFOLIO_ITEM_NOT_FOUND":
            return 404;
    }
}

// Client-side transport failure (API unreachable or unusable response).
// Deliberately not a DomainError: it never crosses the wire, so the API's code→status map stays total.
export class NetworkError extends Error {
    readonly code = "NETWORK_ERROR";
    constructor(cause: unknown) {
        super("API request failed");
        this.name = "NetworkError";
        this.cause = cause;
    }
}

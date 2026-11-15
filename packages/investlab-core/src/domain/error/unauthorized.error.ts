// Client-side: the API rejected our bearer token (HTTP 401). An operator misconfiguration, not an outage.
// Deliberately not a DomainError, for the same reason as NetworkError.
export class UnauthorizedError extends Error {
    readonly code = "UNAUTHORIZED";
    constructor(cause: unknown) {
        super("API rejected the bearer token");
        this.name = "UnauthorizedError";
        this.cause = cause;
    }
}

// fallow-ignore-file unused-class-member -- `code` is the wire discriminant (ADR 0005), read by consumers through the error unions
// Shared kernel errors. Module errors extend DomainError in their own domain layer.
export type KernelErrorCode = "PERSISTENCE_ERROR" | "VALIDATION_ERROR";

export abstract class DomainError<Code extends string = string> extends Error {
    abstract readonly code: Code;
}

export class PersistenceError extends DomainError<"PERSISTENCE_ERROR"> {
    readonly code = "PERSISTENCE_ERROR";
    constructor(cause: unknown) {
        super("Database operation failed");
        this.name = "PersistenceError";
        this.cause = cause;
    }
}

export class ValidationError extends DomainError<"VALIDATION_ERROR"> {
    readonly code = "VALIDATION_ERROR";
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

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

/** Failures every remote (HTTP) port can return whatever the module: kernel codes rebuilt as errors plus transport and authorization failures. */
export type KernelError = ValidationError | PersistenceError | NetworkError | UnauthorizedError;

/** A remote port's failures: the kernel errors plus the module errors `E` it rebuilds from server codes. */
export type RemotePortError<E extends DomainError = never> = KernelError | E;

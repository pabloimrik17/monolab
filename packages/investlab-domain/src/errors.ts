// fallow-ignore-file unused-class-member -- abstract code contract implemented by subclasses, read by use-cases pending
export type DomainErrorCode =
    | "PERSISTENCE_ERROR"
    | "VALIDATION_ERROR"
    | "INSTRUMENT_NOT_FOUND"
    | "PORTFOLIO_ITEM_NOT_FOUND";

export abstract class DomainError extends Error {
    abstract readonly code: DomainErrorCode;
}

export class PersistenceError extends DomainError {
    readonly code = "PERSISTENCE_ERROR";
    constructor(cause: unknown) {
        super("Database operation failed");
        this.name = "PersistenceError";
        this.cause = cause;
    }
}

export class ValidationError extends DomainError {
    readonly code = "VALIDATION_ERROR";
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

export class InstrumentNotFoundError extends DomainError {
    readonly code = "INSTRUMENT_NOT_FOUND";
    constructor(id: string) {
        super(`Instrument not found: ${id}`);
        this.name = "InstrumentNotFoundError";
    }
}

export class PortfolioItemNotFoundError extends DomainError {
    readonly code = "PORTFOLIO_ITEM_NOT_FOUND";
    constructor(id: string) {
        super(`Portfolio item not found: ${id}`);
        this.name = "PortfolioItemNotFoundError";
    }
}

// Client-side transport failure (API unreachable, unauthorized or unusable response).
// Deliberately not a DomainError: it never crosses the wire, so the API's code→status map stays total.
export class NetworkError extends Error {
    readonly code = "NETWORK_ERROR";
    constructor(cause: unknown) {
        super("API request failed");
        this.name = "NetworkError";
        this.cause = cause;
    }
}

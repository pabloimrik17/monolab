export abstract class DomainError extends Error {
    abstract readonly code: string;
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

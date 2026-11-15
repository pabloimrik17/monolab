import { DomainError } from "./domain.error.ts";

export class PersistenceError extends DomainError<"PERSISTENCE_ERROR"> {
    readonly code = "PERSISTENCE_ERROR";
    constructor(cause: unknown) {
        super("Database operation failed");
        this.name = "PersistenceError";
        this.cause = cause;
    }
}

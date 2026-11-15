import { DomainError } from "./domain.error.ts";

export class ValidationError extends DomainError<"VALIDATION_ERROR"> {
    readonly code = "VALIDATION_ERROR";
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

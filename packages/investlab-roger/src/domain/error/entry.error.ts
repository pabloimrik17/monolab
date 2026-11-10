import { DomainError } from "@m0n0lab/investlab-core";
import type { EntryField, RogerState } from "#domain/value-object/roger-state.value-object.ts";

export class EntryNotFoundError extends DomainError<"ENTRY_NOT_FOUND"> {
    readonly code = "ENTRY_NOT_FOUND";
    constructor(id: string) {
        super(`Entry not found: ${id}`);
        this.name = "EntryNotFoundError";
    }
}

export class EntryConflictError extends DomainError<"ENTRY_CONFLICT"> {
    readonly code = "ENTRY_CONFLICT";
    constructor(id: string) {
        super(`Entry ${id} was changed by another request; reload and try again`);
        this.name = "EntryConflictError";
    }
}

export class InvalidTransitionError extends DomainError<"INVALID_TRANSITION"> {
    readonly code = "INVALID_TRANSITION";
    /** Without `to`, the refused move is a re-entry. */
    constructor(from: RogerState, to?: RogerState) {
        super(
            to === undefined
                ? `Only a SOLD entry can be re-entered, not one in ${from}`
                : `An entry cannot move from ${from} to ${to}`,
        );
        this.name = "InvalidTransitionError";
    }
}

export class MissingRequiredFieldError extends DomainError<"MISSING_REQUIRED_FIELD"> {
    readonly code = "MISSING_REQUIRED_FIELD";
    constructor(readonly field: EntryField) {
        super(`Missing required field: ${field}`);
        this.name = "MissingRequiredFieldError";
    }
}

export class FieldNotInStateError extends DomainError<"FIELD_NOT_IN_STATE"> {
    readonly code = "FIELD_NOT_IN_STATE";
    constructor(
        readonly field: EntryField,
        state: RogerState,
    ) {
        super(`An entry in ${state} has no ${field}`);
        this.name = "FieldNotInStateError";
    }
}

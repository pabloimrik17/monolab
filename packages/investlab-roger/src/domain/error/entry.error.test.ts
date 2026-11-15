import { describe, expect, it } from "vitest";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import { DomainError } from "@m0n0lab/investlab-core";
import {
    EntryConflictError,
    EntryNotFoundError,
    FieldNotInStateError,
    InvalidTransitionError,
    MissingRequiredFieldError,
} from "./entry.error.ts";

describe("entryError", () => {
    it.each([
        [
            new EntryNotFoundError("entry-1"),
            "ENTRY_NOT_FOUND",
            "EntryNotFoundError",
            "Entry not found: entry-1",
        ],
        [
            new EntryConflictError("entry-1"),
            "ENTRY_CONFLICT",
            "EntryConflictError",
            "Entry entry-1 was changed by another request; reload and try again",
        ],
        [
            new InvalidTransitionError(RogerState.Sold, RogerState.Invested),
            "INVALID_TRANSITION",
            "InvalidTransitionError",
            "An entry cannot move from SOLD to INVESTED",
        ],
        [
            new InvalidTransitionError(RogerState.Invested),
            "INVALID_TRANSITION",
            "InvalidTransitionError",
            "Only a SOLD entry can be re-entered, not one in INVESTED",
        ],
        [
            new MissingRequiredFieldError("quantity"),
            "MISSING_REQUIRED_FIELD",
            "MissingRequiredFieldError",
            "Missing required field: quantity",
        ],
        [
            new FieldNotInStateError("quantity", RogerState.Watching),
            "FIELD_NOT_IN_STATE",
            "FieldNotInStateError",
            "An entry in WATCHING has no quantity",
        ],
    ])("%s carries its code, name and message", (error, code, name, message) => {
        expect(error).toBeInstanceOf(DomainError);
        expect(error.code).toBe(code);
        expect(error.name).toBe(name);
        expect(error.message).toBe(message);
    });
});

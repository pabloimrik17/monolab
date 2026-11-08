import type {
    EntryConflictError,
    EntryNotFoundError,
    FieldNotInStateError,
    InvalidTransitionError,
    MissingRequiredFieldError,
} from "./entry.error.ts";
import type {
    InstrumentAlreadyExistsError,
    InstrumentNotFoundError,
} from "@m0n0lab/investlab-catalog";
import type { RemotePortError } from "@m0n0lab/investlab-core";

/** Codes of the roger module's own errors; the kernel codes live in core. */
export type RogerErrorCode =
    | "INSTRUMENT_NOT_FOUND"
    | "INSTRUMENT_ALREADY_EXISTS"
    | "ENTRY_NOT_FOUND"
    | "ENTRY_CONFLICT"
    | "INVALID_TRANSITION"
    | "MISSING_REQUIRED_FIELD"
    | "FIELD_NOT_IN_STATE";

export type RogerRemoteError = RemotePortError<
    | InstrumentNotFoundError
    | InstrumentAlreadyExistsError
    | EntryNotFoundError
    | EntryConflictError
    | InvalidTransitionError
    | MissingRequiredFieldError
    | FieldNotInStateError
>;

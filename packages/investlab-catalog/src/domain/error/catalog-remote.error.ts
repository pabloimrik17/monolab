import type {
    InstrumentAlreadyExistsError,
    InstrumentInUseError,
    InstrumentNotFoundError,
} from "./instrument.error.ts";
import type { RemotePortError } from "@m0n0lab/investlab-core";

/** Codes of the catalog module's own errors; the kernel codes live in core. */
export type CatalogErrorCode =
    | "INSTRUMENT_NOT_FOUND"
    | "INSTRUMENT_IN_USE"
    | "INSTRUMENT_ALREADY_EXISTS";

export type CatalogRemoteError = RemotePortError<
    InstrumentNotFoundError | InstrumentInUseError | InstrumentAlreadyExistsError
>;

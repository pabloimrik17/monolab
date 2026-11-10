import { DomainError } from "@m0n0lab/investlab-core";

export class InstrumentNotFoundError extends DomainError<"INSTRUMENT_NOT_FOUND"> {
    readonly code = "INSTRUMENT_NOT_FOUND";
    constructor(id: string) {
        super(`Instrument not found: ${id}`);
        this.name = "InstrumentNotFoundError";
    }
}

export class InstrumentInUseError extends DomainError<"INSTRUMENT_IN_USE"> {
    readonly code = "INSTRUMENT_IN_USE";
    constructor(id: string) {
        super(`Instrument is in use: ${id}`);
        this.name = "InstrumentInUseError";
    }
}

export class InstrumentAlreadyExistsError extends DomainError<"INSTRUMENT_ALREADY_EXISTS"> {
    readonly code = "INSTRUMENT_ALREADY_EXISTS";
    constructor(symbol: string) {
        super(`Instrument already exists: ${symbol}`);
        this.name = "InstrumentAlreadyExistsError";
    }
}

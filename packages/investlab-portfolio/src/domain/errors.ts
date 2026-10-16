// fallow-ignore-file unused-class-member -- `code` implements the abstract DomainError contract, read by the API error mapping through the base type
import { DomainError, type RemotePortError } from "@m0n0lab/investlab-core";

/** Codes of the portfolio module's own errors; the kernel codes live in core. */
export type PortfolioErrorCode =
    | "INSTRUMENT_NOT_FOUND"
    | "INSTRUMENT_IN_USE"
    | "INSTRUMENT_ALREADY_EXISTS"
    | "PORTFOLIO_ITEM_NOT_FOUND"
    | "PORTFOLIO_ITEM_CONFLICT";

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
        super(`Instrument is held in the portfolio: ${id}`);
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

export class PortfolioItemNotFoundError extends DomainError<"PORTFOLIO_ITEM_NOT_FOUND"> {
    readonly code = "PORTFOLIO_ITEM_NOT_FOUND";
    constructor(id: string) {
        super(`Portfolio item not found: ${id}`);
        this.name = "PortfolioItemNotFoundError";
    }
}

export class PortfolioItemConflictError extends DomainError<"PORTFOLIO_ITEM_CONFLICT"> {
    readonly code = "PORTFOLIO_ITEM_CONFLICT";
    constructor(id: string) {
        super(`Portfolio item ${id} was changed by another request; reload and try again`);
        this.name = "PortfolioItemConflictError";
    }
}

/** Every failure a remote (HTTP) portfolio port can return: the kernel failures plus the module errors rebuilt from server codes. */
export type PortfolioRemoteError = RemotePortError<
    | InstrumentNotFoundError
    | InstrumentInUseError
    | InstrumentAlreadyExistsError
    | PortfolioItemNotFoundError
    | PortfolioItemConflictError
>;

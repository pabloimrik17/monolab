import type {
    InstrumentNotFoundError,
    NetworkError,
    PersistenceError,
    PortfolioItemNotFoundError,
    ValidationError,
} from "@m0n0lab/investlab-domain";

// Everything a client-side port (HTTP repository) can fail with: server codes rebuilt as domain errors + transport failure.
export type ClientPortError =
    | PersistenceError
    | NetworkError
    | PortfolioItemNotFoundError
    | InstrumentNotFoundError
    | ValidationError;

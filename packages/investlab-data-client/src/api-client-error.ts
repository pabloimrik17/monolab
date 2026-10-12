import type {
    InstrumentNotFoundError,
    NetworkError,
    PersistenceError,
    PortfolioItemNotFoundError,
    ValidationError,
} from "@m0n0lab/investlab-domain";

/** Every failure an HTTP repository can return: rebuilt domain errors plus transport failures. */
export type ApiClientError =
    | PersistenceError
    | ValidationError
    | InstrumentNotFoundError
    | PortfolioItemNotFoundError
    | NetworkError;

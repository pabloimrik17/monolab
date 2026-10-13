import {
    InstrumentNotFoundError,
    NetworkError,
    PersistenceError,
    PortfolioItemNotFoundError,
    ValidationError,
    UnauthorizedError,
    type RemotePortError,
} from "@m0n0lab/investlab-domain";
import type { ApiErrorDto } from "@m0n0lab/investlab-data-contracts";

/** Rebuilds the domain error named by `dto.code` (ADR 0005); `resourceId` names the missing entity. */
export function apiErrorToDomain(dto: ApiErrorDto, resourceId: string): RemotePortError {
    switch (dto.code) {
        case "PERSISTENCE_ERROR":
            return new PersistenceError(dto);
        case "VALIDATION_ERROR":
            return new ValidationError(dto.message);
        case "INSTRUMENT_NOT_FOUND":
            return new InstrumentNotFoundError(resourceId);
        case "PORTFOLIO_ITEM_NOT_FOUND":
            return new PortfolioItemNotFoundError(resourceId);
        // A rejected token is a client misconfiguration, distinct from an outage.
        case "UNAUTHORIZED":
            return new UnauthorizedError(dto);
        // The API is reachable but unusable for this client: not something the caller can act on per call.
        case "INTERNAL_ERROR":
            return new NetworkError(dto);
    }
}

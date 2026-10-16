import {
    NetworkError,
    PersistenceError,
    ValidationError,
    UnauthorizedError,
    type ApiErrorDto,
} from "@m0n0lab/investlab-core";
import {
    InstrumentNotFoundError,
    PortfolioItemConflictError,
    PortfolioItemNotFoundError,
    type PortfolioRemoteError,
} from "@m0n0lab/investlab-domain";

/** Rebuilds the domain error named by `dto.code` (ADR 0005); `resourceId` names the missing entity. */
export function apiErrorToDomain(dto: ApiErrorDto, resourceId: string): PortfolioRemoteError {
    switch (dto.code) {
        case "PERSISTENCE_ERROR":
            return new PersistenceError(dto);
        case "VALIDATION_ERROR":
            return new ValidationError(dto.message);
        case "INSTRUMENT_NOT_FOUND":
            return new InstrumentNotFoundError(resourceId);
        case "PORTFOLIO_ITEM_NOT_FOUND":
            return new PortfolioItemNotFoundError(resourceId);
        case "PORTFOLIO_ITEM_CONFLICT":
            return new PortfolioItemConflictError(resourceId);
        // A rejected token is a client misconfiguration, distinct from an outage.
        case "UNAUTHORIZED":
            return new UnauthorizedError(dto);
        // API reachable but unusable for this client; not actionable per call.
        case "INTERNAL_ERROR":
            return new NetworkError(dto);
    }
}

import { DomainError } from "@m0n0lab/investlab-core";

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

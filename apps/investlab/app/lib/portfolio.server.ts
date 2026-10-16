import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/client";
import { getContainer } from "./container.server";
import type {
    PortfolioItemCreateUseCase,
    PortfolioItemUpdateUseCase,
} from "@m0n0lab/investlab-portfolio/client";

// The portfolio module's client use cases; route modules reach `./client` only through here.

export function listPortfolio() {
    return getContainer().get(PORTFOLIO.ItemList).execute();
}

export function addHolding(holding: Parameters<PortfolioItemCreateUseCase["execute"]>[0]) {
    return getContainer().get(PORTFOLIO.ItemCreate).execute(holding);
}

export function changeHolding(
    id: string,
    changes: Parameters<PortfolioItemUpdateUseCase["execute"]>[1],
    expectedUpdatedAt: Date,
) {
    return getContainer().get(PORTFOLIO.ItemUpdate).execute(id, changes, expectedUpdatedAt);
}

export function removeHolding(id: string) {
    return getContainer().get(PORTFOLIO.ItemDelete).execute(id);
}

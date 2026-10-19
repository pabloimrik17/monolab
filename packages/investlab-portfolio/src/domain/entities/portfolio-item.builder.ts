import { PortfolioItem } from "./portfolio-item.ts";

type PortfolioItemDraft = Parameters<typeof PortfolioItem.create>[0];

export function makePortfolioItem(overrides: Partial<PortfolioItemDraft> = {}): PortfolioItem {
    return PortfolioItem.create({
        instrumentId: crypto.randomUUID(),
        broker: "MyInvestor",
        targetWeight: 10,
        ...overrides,
    })._unsafeUnwrap();
}

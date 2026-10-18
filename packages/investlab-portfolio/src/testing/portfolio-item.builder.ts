import { PortfolioItem } from "../domain/entities/portfolio-item.ts";

type PortfolioItemDraft = Parameters<typeof PortfolioItem.create>[0];

/** A valid portfolio item for tests; `overrides` replace the defaults field by field. */
export function makePortfolioItem(overrides: Partial<PortfolioItemDraft> = {}): PortfolioItem {
    const created = PortfolioItem.create({
        instrumentId: crypto.randomUUID(),
        broker: "MyInvestor",
        targetWeight: 10,
        ...overrides,
    });
    if (created.isErr()) throw created.error;
    return created.value;
}

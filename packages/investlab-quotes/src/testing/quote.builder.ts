import type { Quote } from "../domain/quote.ts";

/** A quote for tests; `overrides` replace the defaults field by field. */
export function makeQuote(overrides: Partial<Quote> = {}): Quote {
    return {
        symbol: "AAPL",
        price: 190.5,
        change: -1.2,
        changePercent: -0.63,
        updatedAt: new Date("2026-10-12T14:30:00.000Z"),
        ...overrides,
    };
}

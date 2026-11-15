import { describe, expect, it } from "vitest";
import { Ticker } from "./ticker.model.ts";

describe("Ticker", () => {
    describe("create", () => {
        it("holds the symbol trimmed and uppercased, added now", () => {
            const before = new Date();

            const ticker = Ticker.create("  brk.b  ")._unsafeUnwrap();

            expect(ticker.symbol).toBe("BRK.B");
            expect(ticker.addedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        });

        it.each([[""], ["   "], ["AA PL"], ["$AAPL"], ["A".repeat(16)]])(
            "returns ValidationError for the symbol %j",
            (symbol) => {
                const error = Ticker.create(symbol)._unsafeUnwrapErr();

                expect(error.code).toBe("VALIDATION_ERROR");
            },
        );
    });

    describe("reconstitute", () => {
        it("hydrates from raw props without validation", () => {
            const addedAt = new Date("2026-09-30T08:15:00.000Z");

            const ticker = Ticker.reconstitute({ symbol: "aapl", addedAt });

            expect(ticker.symbol).toBe("aapl");
            expect(ticker.addedAt).toBe(addedAt);
        });
    });
});

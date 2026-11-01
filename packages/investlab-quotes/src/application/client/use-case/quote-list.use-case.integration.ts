import { beforeEach, describe, expect, it } from "vitest";
import { QUOTES } from "#application/client/tokens.ts";
import { givenApiUnavailable, givenQuotesFor, givenTokenRejected } from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import { NetworkError, UnauthorizedError } from "@m0n0lab/investlab-core";
import type { QuoteListUseCase } from "./quote-list.use-case.ts";

const SPY = {
    price: 512.3,
    change: 1.2,
    changePercent: 0.23,
    updatedAt: "2026-10-12T15:30:00.000Z",
};
const QQQ = {
    price: 480.1,
    change: -0.4,
    changePercent: -0.08,
    updatedAt: "2026-10-12T15:30:00.000Z",
};

describe("QuoteListUseCase", () => {
    let list: QuoteListUseCase;
    beforeEach(() => {
        list = container.get(QUOTES.List);
    });

    it("returns the quotes known for the asked symbols", async () => {
        givenQuotesFor({ SPY, QQQ });

        const quotes = (await list.execute(["SPY", "QQQ", "NOPE"]))._unsafeUnwrap();

        expect(quotes).toEqual([
            { symbol: "SPY", ...SPY, updatedAt: new Date(SPY.updatedAt) },
            { symbol: "QQQ", ...QQQ, updatedAt: new Date(QQQ.updatedAt) },
        ]);
    });

    it("returns nothing when no symbol is asked for", async () => {
        const quotes = (await list.execute([]))._unsafeUnwrap();

        expect(quotes).toEqual([]);
    });

    it("fails as unavailable while the service cannot be reached", async () => {
        givenApiUnavailable();

        const error = (await list.execute(["SPY"]))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(NetworkError);
    });

    it("fails as unauthorized when the service rejects the web's credentials", async () => {
        givenTokenRejected();

        const error = (await list.execute(["SPY"]))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(UnauthorizedError);
    });
});

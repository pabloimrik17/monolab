import { describe, expect, it } from "vitest";
import {
    InstrumentNotFoundError,
    NetworkError,
    PersistenceError,
    PortfolioItemNotFoundError,
    UnauthorizedError,
    ValidationError,
} from "@m0n0lab/investlab-domain";
import { remoteErrorMessage, remoteErrorStatus } from "./remote-error";

describe("remoteErrorMessage", () => {
    it("tells the user the service is unavailable when the API cannot be reached", () => {
        expect(remoteErrorMessage(new NetworkError(new TypeError("fetch failed")))).toBe(
            "InvestLab service is unavailable. Please try again later.",
        );
    });

    it("points the operator at the token when the API rejects it", () => {
        expect(remoteErrorMessage(new UnauthorizedError({ code: "UNAUTHORIZED" }))).toBe(
            "API token is not accepted by investlab-api; check INVESTLAB_API_TOKEN",
        );
    });

    it("hides persistence details behind a generic message", () => {
        expect(remoteErrorMessage(new PersistenceError("db down"))).toBe(
            "InvestLab could not complete the request. Please try again later.",
        );
    });

    it.each([
        new ValidationError("Target weight must be between 0 and 100"),
        new InstrumentNotFoundError("instrument-1"),
        new PortfolioItemNotFoundError("item-1"),
    ])("keeps the message of $code", (error) => {
        expect(remoteErrorMessage(error)).toBe(error.message);
    });
});

describe("remoteErrorStatus", () => {
    it("answers 503 when the API cannot be reached", () => {
        expect(remoteErrorStatus(new NetworkError("down"))).toBe(503);
    });

    it.each([
        [new PersistenceError("db down"), 500],
        [new UnauthorizedError({ code: "UNAUTHORIZED" }), 500],
        [new ValidationError("bad"), 422],
        [new InstrumentNotFoundError("instrument-1"), 404],
        [new PortfolioItemNotFoundError("item-1"), 404],
    ])("maps %o to %i", (error, status) => {
        expect(remoteErrorStatus(error)).toBe(status);
    });
});

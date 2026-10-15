import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    InstrumentNotFoundError,
    PersistenceError,
    PortfolioItemConflictError,
    PortfolioItemNotFoundError,
    ValidationError,
} from "@m0n0lab/investlab-domain";
import { errorJson, errorToHttp, toApiError } from "./error-mapping.ts";

describe("errorToHttp", () => {
    it.each([
        [new PortfolioItemNotFoundError("x"), 404],
        [new InstrumentNotFoundError("x"), 404],
        [new PortfolioItemConflictError("x"), 409],
        [new ValidationError("bad"), 422],
        [new PersistenceError(new Error("db")), 500],
    ])("maps %s to %i", (error, expected) => {
        expect(errorToHttp(error)).toBe(expected);
    });

    it("keys on code, not class name", () => {
        class RenamedNotFound extends PortfolioItemNotFoundError {
            constructor() {
                super("x");
                this.name = "SomethingElse";
            }
        }

        expect(errorToHttp(new RenamedNotFound())).toBe(404);
    });
});

describe("toApiError", () => {
    it("builds { code, message, statusCode } from a domain error", () => {
        expect(toApiError(new PortfolioItemNotFoundError("abc"))).toEqual({
            code: "PORTFOLIO_ITEM_NOT_FOUND",
            message: "Portfolio item not found: abc",
            statusCode: 404,
        });
    });

    it("hides the message on 5xx", () => {
        expect(toApiError(new PersistenceError(new Error("secret db detail")))).toEqual({
            code: "PERSISTENCE_ERROR",
            message: "Internal server error",
            statusCode: 500,
        });
    });
});

describe("errorJson", () => {
    it("responds with the mapped status and body", async () => {
        const app = new Hono();
        app.get("/", (c) => errorJson(c, new InstrumentNotFoundError("i1")));

        const res = await app.request("/");

        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({
            code: "INSTRUMENT_NOT_FOUND",
            message: "Instrument not found: i1",
            statusCode: 404,
        });
    });

    describe("logging", () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("logs a 5xx error with its cause before hiding it", async () => {
            const log = vi.spyOn(console, "error").mockImplementation(() => {});
            const error = new PersistenceError(new Error("connection refused"));
            const app = new Hono();
            app.get("/", (c) => errorJson(c, error));

            await app.request("/");

            expect(log).toHaveBeenCalledWith(expect.any(String), error);
        });

        it("does not log a 4xx error", async () => {
            const log = vi.spyOn(console, "error").mockImplementation(() => {});
            const app = new Hono();
            app.get("/", (c) => errorJson(c, new InstrumentNotFoundError("i1")));

            await app.request("/");

            expect(log).not.toHaveBeenCalled();
        });
    });
});

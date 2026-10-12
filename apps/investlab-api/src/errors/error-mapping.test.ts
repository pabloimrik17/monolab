import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import {
    InstrumentNotFoundError,
    PersistenceError,
    PortfolioItemNotFoundError,
    ValidationError,
} from "@m0n0lab/investlab-domain";
import { errorJson, errorToHttp, toApiError } from "./error-mapping.ts";

describe("errorToHttp", () => {
    it.each([
        [new PortfolioItemNotFoundError("x"), 404],
        [new InstrumentNotFoundError("x"), 404],
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
});

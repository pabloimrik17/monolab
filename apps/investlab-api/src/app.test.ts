import { Hono } from "hono";
import { Container } from "inversify";
import { describe, expect, it } from "vitest";
import { PersistenceError } from "@m0n0lab/investlab-core";
import { PortfolioItemNotFoundError } from "@m0n0lab/investlab-domain";
import { createApp } from "./app.ts";
import { handleError } from "./errors/error-mapping.ts";

const TOKEN = "s3cret-token";

describe("createApp", () => {
    const app = createApp(new Container(), { token: TOKEN });

    it("serves GET /health without a token", async () => {
        const res = await app.request("/health");

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: "ok" });
    });

    it("rejects any other route without a token", async () => {
        const res = await app.request("/portfolio-items");

        expect(res.status).toBe(401);
    });

    it("answers unknown routes 404 once authenticated", async () => {
        const res = await app.request("/nope", { headers: { Authorization: `Bearer ${TOKEN}` } });

        expect(res.status).toBe(404);
    });

    it("maps a thrown domain error through the error mapping", async () => {
        const failing = new Hono();
        failing.onError(handleError);
        failing.get("/boom", () => {
            throw new PersistenceError(new Error("db"));
        });

        const res = await failing.request("/boom");

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({
            code: "PERSISTENCE_ERROR",
            message: "Internal server error",
            statusCode: 500,
        });
    });

    it("answers a domain 404 with its code", async () => {
        const failing = new Hono();
        failing.onError(handleError);
        failing.get("/missing", () => {
            throw new PortfolioItemNotFoundError("p1");
        });

        const res = await failing.request("/missing");

        expect(res.status).toBe(404);
        expect((await res.json()).code).toBe("PORTFOLIO_ITEM_NOT_FOUND");
    });

    it("hides unexpected errors behind a generic 500", async () => {
        const failing = new Hono();
        failing.onError(handleError);
        failing.get("/boom", () => {
            throw new Error("leaky");
        });

        const res = await failing.request("/boom");

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({
            code: "INTERNAL_ERROR",
            message: "Internal server error",
            statusCode: 500,
        });
    });
});

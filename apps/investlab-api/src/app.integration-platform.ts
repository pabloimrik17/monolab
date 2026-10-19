import { describe, expect, it } from "vitest";
import { DomainError, PersistenceError, type ApiErrorDto } from "@m0n0lab/investlab-core";
import { PortfolioItemsHarness } from "./routes/portfolio-items.harness.ts";
import { BaseApiHarness } from "./testing/base-api-harness.ts";

const TOKEN = "s3cret-token";

const UNAUTHORIZED = {
    code: "UNAUTHORIZED",
    message: "Invalid or missing bearer token",
    statusCode: 401,
} satisfies ApiErrorDto;

const INTERNAL_ERROR = {
    code: "INTERNAL_ERROR",
    message: "Internal server error",
    statusCode: 500,
} satisfies ApiErrorDto;

describe("the API as a platform", () => {
    it("serves GET /health without a token", async () => {
        await using api = await BaseApiHarness.launch();

        const res = await api.health();

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: "ok" });
    });

    it("answers unknown routes 404 once authenticated", async () => {
        await using api = await BaseApiHarness.launch();

        const res = await api.get("/nope");

        expect(res.status).toBe(404);
    });

    it("fails a request whose use case reaches a guarded platform port, naming the port", async () => {
        await using api = await BaseApiHarness.launch();
        api.silenceErrorLog();

        await expect(api.get("/portfolio-items")).rejects.toThrow(
            "system boundary reached: PLATFORM.Db",
        );
    });
});

// Every route answers through the same `errorJson` and `app.onError`, so one route proves it.
describe("errors hidden behind a 500", () => {
    it("answers a generic 500 for a use case that throws and logs the cause", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const log = api.silenceErrorLog();
        const error = new Error("leaky");
        api.givenListThrows(error);

        const { status, body } = await api.listItems();

        expect(status).toBe(500);
        expect(body).toEqual(INTERNAL_ERROR);
        expect(log.calls).toEqual([[expect.any(String), error]]);
    });

    it("answers a generic 500 for a domain error the API does not map", async () => {
        class UnmappedError extends DomainError<"UNMAPPED"> {
            readonly code = "UNMAPPED";
        }
        await using api = await PortfolioItemsHarness.launch();
        api.silenceErrorLog();
        api.givenListThrows(new UnmappedError("leaky"));

        const { status, body } = await api.listItems();

        expect(status).toBe(500);
        expect(body).toEqual(INTERNAL_ERROR);
    });

    it("answers 500 PERSISTENCE_ERROR without its message and logs the cause", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const log = api.silenceErrorLog();
        const error = new PersistenceError(new Error("db down"));
        api.givenListFails(error);

        const { status, body } = await api.listItems();

        expect(status).toBe(500);
        expect(body).toEqual({
            code: "PERSISTENCE_ERROR",
            message: "Internal server error",
            statusCode: 500,
        } satisfies ApiErrorDto);
        expect(log.calls).toEqual([[expect.any(String), error]]);
    });
});

describe("bearer authentication", () => {
    it("rejects a request without an Authorization header", async () => {
        await using api = await BaseApiHarness.launch();

        const res = await api.anonymous("/portfolio-items");

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual(UNAUTHORIZED);
    });

    it("rejects a wrong token", async () => {
        await using api = await BaseApiHarness.launch();

        const res = await api.withAuthorization("/portfolio-items", "Bearer wrong-token");

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual(UNAUTHORIZED);
    });

    it("rejects a token of the same length but different content", async () => {
        await using api = await BaseApiHarness.launch();

        const res = await api.withAuthorization(
            "/portfolio-items",
            `Bearer ${"x".repeat(TOKEN.length)}`,
        );

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual(UNAUTHORIZED);
    });

    it("rejects a non-Bearer scheme", async () => {
        await using api = await BaseApiHarness.launch();

        const res = await api.withAuthorization("/portfolio-items", `Basic ${TOKEN}`);

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual(UNAUTHORIZED);
    });

    it("rejects every request while no token is configured, even an empty bearer", async () => {
        await using api = await BaseApiHarness.launch({ token: "" });

        const responses = await Promise.all([
            api.withAuthorization("/portfolio-items", "Bearer "),
            api.anonymous("/portfolio-items"),
        ]);

        expect(responses.map((r) => r.status)).toEqual([401, 401]);
    });
});

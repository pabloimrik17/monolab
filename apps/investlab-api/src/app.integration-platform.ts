import { describe, expect, it, vi } from "vitest";
import { BaseApiHarness } from "./testing/base-api-harness.ts";

const TOKEN = "s3cret-token";

const UNAUTHORIZED = {
    code: "UNAUTHORIZED",
    message: "Invalid or missing bearer token",
    statusCode: 401,
};

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
        vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(api.get("/portfolio-items")).rejects.toThrow(
            "system boundary reached: PLATFORM.Db",
        );
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

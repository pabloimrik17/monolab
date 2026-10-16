import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { bearerAuth } from "./bearer-auth.ts";

const TOKEN = "s3cret-token";

function createApp(token: string | undefined = TOKEN) {
    const app = new Hono();
    app.use("*", bearerAuth(token));
    app.get("/protected", (c) => c.json({ ok: true }));
    return app;
}

async function expectUnauthorized(res: Response) {
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
        code: "UNAUTHORIZED",
        message: "Invalid or missing bearer token",
        statusCode: 401,
    });
}

describe("bearerAuth middleware", () => {
    it("returns 401 when the Authorization header is missing", async () => {
        await expectUnauthorized(await createApp().request("/protected"));
    });

    it("returns 401 for a wrong token", async () => {
        const res = await createApp().request("/protected", {
            headers: { Authorization: "Bearer wrong-token" },
        });

        await expectUnauthorized(res);
    });

    it("returns 401 for a token of the same length but different content", async () => {
        const res = await createApp().request("/protected", {
            headers: { Authorization: `Bearer ${"x".repeat(TOKEN.length)}` },
        });

        await expectUnauthorized(res);
    });

    it("returns 401 for a non-Bearer scheme", async () => {
        const res = await createApp().request("/protected", {
            headers: { Authorization: `Basic ${TOKEN}` },
        });

        await expectUnauthorized(res);
    });

    it("returns 401 when no token is configured, even for an empty bearer", async () => {
        const app = createApp(undefined);

        await expectUnauthorized(
            await app.request("/protected", { headers: { Authorization: "Bearer " } }),
        );
        await expectUnauthorized(await app.request("/protected"));
    });

    it("passes through with the correct token", async () => {
        const res = await createApp().request("/protected", {
            headers: { Authorization: `Bearer ${TOKEN}` },
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
    });
});

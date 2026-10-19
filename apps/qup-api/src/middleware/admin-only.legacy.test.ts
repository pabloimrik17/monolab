import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adminOnly } from "./admin-only.ts";

describe("adminOnly middleware", () => {
    let app: Hono;
    const ORIGINAL_ENV = process.env.API_ADMIN_PIN;

    beforeEach(() => {
        process.env.API_ADMIN_PIN = "secret-pin";
        app = new Hono();
        app.use("/admin/*", adminOnly());
        app.get("/admin/test", (c) => c.json({ ok: true }));
    });

    afterEach(() => {
        if (ORIGINAL_ENV !== undefined) {
            process.env.API_ADMIN_PIN = ORIGINAL_ENV;
        } else {
            delete process.env.API_ADMIN_PIN;
        }
    });

    it("returns 401 when header is missing", async () => {
        const res = await app.request("/admin/test");
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 when pin is wrong", async () => {
        const res = await app.request("/admin/test", {
            headers: { "X-Admin-Pin": "wrong" },
        });
        expect(res.status).toBe(401);
    });

    it("passes through when pin is correct", async () => {
        const res = await app.request("/admin/test", {
            headers: { "X-Admin-Pin": "secret-pin" },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
    });
});

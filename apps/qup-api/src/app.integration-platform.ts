// fallow-ignore-file code-duplication -- the platform checks every API proves through its own harness mirror investlab-api's
import { describe, expect, it } from "vitest";
import { DomainError, PersistenceError } from "@m0n0lab/qup-domain";
import { ApiHarness } from "./harness/api.harness.ts";
import { makeSession } from "./harness/builders.ts";
import { SessionRouteHarness } from "./routes/session.routes.harness.ts";
import type { ApiErrorDto } from "@m0n0lab/qup-shared";

const INTERNAL_ERROR = {
    code: "INTERNAL_ERROR",
    message: "Internal server error",
    statusCode: 500,
} satisfies ApiErrorDto;

const UNAUTHORIZED = {
    code: "UNAUTHORIZED",
    message: "Invalid admin PIN",
    statusCode: 401,
} satisfies ApiErrorDto;

describe("createApp", () => {
    describe("the API as a platform", () => {
        it("exposes exactly the documented routes", async () => {
            await using api = await ApiHarness.launch();

            const routes = [...new Set(api.routes())]
                .filter((route) => !route.startsWith("ALL "))
                .sort();

            expect(routes).toEqual(
                [
                    "POST /sessions",
                    "GET /sessions",
                    "GET /sessions/code/:code",
                    "GET /sessions/code/:code/orders",
                    "GET /sessions/code/:code/board",
                    "GET /sessions/:id/orders",
                    "GET /sessions/:id",
                    "PATCH /sessions/:id/close",
                    "POST /orders",
                    "PATCH /orders/:id/status",
                    "DELETE /orders/:id",
                    "GET /menu",
                    "POST /menu",
                    "PATCH /menu/:id",
                    "DELETE /menu/:id",
                    "GET /events/sessions/:code",
                    "GET /events/sessions/:code/board",
                ].sort(),
            );
        });

        it("answers unknown routes 404", async () => {
            await using api = await ApiHarness.launch();

            const res = await api.get("/nope");

            expect(res.status).toBe(404);
        });

        it("allows cross-origin requests from any origin", async () => {
            await using api = await ApiHarness.launch();

            const res = await api.anonymous("/menu", {
                method: "OPTIONS",
                headers: {
                    Origin: "http://localhost:3000",
                    "Access-Control-Request-Method": "POST",
                },
            });

            expect(res.status).toBe(204);
            expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
        });

        it("fails a request whose use case reaches the guarded database, naming the port", async () => {
            await using api = await ApiHarness.launch();
            api.silenceErrorLog();

            await expect(api.get("/menu")).rejects.toThrow(
                "system boundary reached: DATA_TOKENS.DrizzleDb",
            );
        });
    });

    describe("admin PIN", () => {
        it("rejects an admin route without the X-Admin-Pin header", async () => {
            await using api = await ApiHarness.launch();

            const res = await api.anonymous("/sessions/x/close", { method: "PATCH" });

            expect(res.status).toBe(401);
            expect(await res.json()).toEqual(UNAUTHORIZED);
        });

        it("rejects a wrong PIN", async () => {
            await using api = await ApiHarness.launch();

            const res = await api.withAdminPin("/sessions/x/close", "0000", { method: "PATCH" });

            expect(res.status).toBe(401);
            expect(await res.json()).toEqual(UNAUTHORIZED);
        });

        it("lets the configured PIN through to the route", async () => {
            await using api = await SessionRouteHarness.launch();
            const close = api.givenCloseSucceeds();

            const { status } = await api.closeSession("x");

            expect(status).toBe(200);
            expect(close.calls).toEqual([["x"]]);
        });
    });

    // Every route answers through the same `errorJson` and `app.onError`, so one route proves it.
    describe("errors hidden behind a 500", () => {
        it("answers a generic 500 for a use case that throws and logs the cause", async () => {
            await using api = await SessionRouteHarness.launch();
            const log = api.silenceErrorLog();
            const error = new Error("leaky");
            api.givenSessionByIdThrows(error);

            const { status, body } = await api.sessionById("x");

            expect(status).toBe(500);
            expect(body).toEqual(INTERNAL_ERROR);
            expect(log.calls).toEqual([[expect.any(String), error]]);
        });

        it("answers a hidden 500 with its code for a domain error the API does not map", async () => {
            class UnmappedError extends DomainError {
                readonly code = "UNMAPPED";
            }
            await using api = await SessionRouteHarness.launch();
            api.givenSessionByIdFails(new UnmappedError("leaky") as never);

            const { status, body } = await api.sessionById("x");

            expect(status).toBe(500);
            expect(body).toEqual({
                code: "UNMAPPED",
                message: "Internal server error",
                statusCode: 500,
            });
        });

        it("answers 500 PERSISTENCE_ERROR without its message", async () => {
            await using api = await SessionRouteHarness.launch();
            api.givenSessionByIdFails(new PersistenceError(new Error("db down")));

            const { status, body } = await api.sessionById("x");

            expect(status).toBe(500);
            expect(body).toEqual({
                code: "PERSISTENCE_ERROR",
                message: "Internal server error",
                statusCode: 500,
            } satisfies ApiErrorDto);
        });

        it("maps a domain error thrown past the route through the same envelope", async () => {
            await using api = await SessionRouteHarness.launch();
            api.givenSessionByIdThrows(new PersistenceError(new Error("db down")));

            const { status, body } = await api.sessionById(makeSession().id);

            expect(status).toBe(500);
            expect(body).toEqual({
                code: "PERSISTENCE_ERROR",
                message: "Internal server error",
                statusCode: 500,
            } satisfies ApiErrorDto);
        });
    });
});

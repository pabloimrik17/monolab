import { Container } from "inversify";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { platformClientModule } from "./platform-client.module.ts";
import { PLATFORM } from "./tokens.ts";
import type { ApiErrorDto } from "@m0n0lab/investlab-core";

const BASE_URL = "http://investlab-api.test";
const TOKEN = "s3cret-token";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

class ThingNotFoundError extends Error {
    readonly code = "THING_NOT_FOUND";
    constructor(readonly id: string) {
        super(`Thing ${id} not found`);
    }
}

const thingSchema = z.object({ id: z.string() });

function apiClient({ baseUrl = BASE_URL, token = TOKEN } = {}) {
    const container = new Container();
    container.bind(PLATFORM.Config).toConstantValue({ api: { baseUrl, token } });
    container.load(platformClientModule);
    return container.get(PLATFORM.InvestlabApiClient);
}

/** Fake API: answers 401 unless the bearer token matches, like the real middleware. */
function fakeApi(method: "get" | "post" | "delete", path: string, respond: () => Response) {
    server.use(
        http[method](`${BASE_URL}${path}`, ({ request }) =>
            request.headers.get("authorization") === `Bearer ${TOKEN}`
                ? respond()
                : HttpResponse.json({}, { status: 401 }),
        ),
    );
}

function apiError(statusCode: number, code: ApiErrorDto["code"], message = "failed") {
    return HttpResponse.json({ code, message, statusCode } satisfies ApiErrorDto, {
        status: statusCode,
    });
}

describe("InvestlabApiClient", () => {
    it("returns the success body validated by the caller's schema", async () => {
        fakeApi("get", "/things/1", () => HttpResponse.json({ id: "1" }));

        const result = await apiClient({ baseUrl: `${BASE_URL}/` }).json(
            "GET",
            "/things/1",
            thingSchema,
        );

        expect(result._unsafeUnwrap()).toEqual({ id: "1" });
    });

    it("sends the body as JSON", async () => {
        let sent: unknown;
        server.use(
            http.post(`${BASE_URL}/things`, async ({ request }) => {
                sent = await request.json();
                return HttpResponse.json({ id: "2" }, { status: 201 });
            }),
        );

        await apiClient().json("POST", "/things", thingSchema, { body: { name: "two" } });

        expect(sent).toEqual({ name: "two" });
    });

    it("accepts an empty success", async () => {
        fakeApi("delete", "/things/1", () => new HttpResponse(null, { status: 204 }));

        const result = await apiClient().empty("DELETE", "/things/1");

        expect(result.isOk()).toBe(true);
    });

    it("rebuilds a module code with the caller's factory", async () => {
        fakeApi("get", "/things/9", () => apiError(404, "INSTRUMENT_NOT_FOUND"));

        const result = await apiClient().json("GET", "/things/9", thingSchema, {
            errors: { INSTRUMENT_NOT_FOUND: () => new ThingNotFoundError("9") },
        });

        expect(result._unsafeUnwrapErr()).toEqual(new ThingNotFoundError("9"));
    });

    it.each([
        ["VALIDATION_ERROR", 422, "ValidationError"],
        ["PERSISTENCE_ERROR", 500, "PersistenceError"],
    ] as const)("rebuilds the kernel code %s itself", async (code, status, name) => {
        fakeApi("get", "/things/1", () => apiError(status, code));

        const result = await apiClient().json("GET", "/things/1", thingSchema);

        expect(result._unsafeUnwrapErr()).toMatchObject({ code, name });
    });

    it("returns UnauthorizedError when the API rejects the token", async () => {
        fakeApi("get", "/things/1", () => HttpResponse.json({ id: "1" }));

        const result = await apiClient({ token: "wrong" }).json("GET", "/things/1", thingSchema);

        expect(result._unsafeUnwrapErr()).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("returns UnauthorizedError on a 401 whose body is not JSON", async () => {
        fakeApi("get", "/things/1", () => new HttpResponse("Unauthorized", { status: 401 }));

        const result = await apiClient().json("GET", "/things/1", thingSchema);

        expect(result._unsafeUnwrapErr()).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("applies the caller's timeout", async () => {
        server.use(
            http.get(`${BASE_URL}/things/1`, async () => {
                await delay(200);
                return HttpResponse.json({ id: "1" });
            }),
        );

        const result = await apiClient().json("GET", "/things/1", thingSchema, { timeoutMs: 20 });

        expect(result._unsafeUnwrapErr()).toMatchObject({ code: "NETWORK_ERROR" });
    });

    it.each<[string, () => Response]>([
        ["a module code the caller did not map", () => apiError(404, "PORTFOLIO_ITEM_NOT_FOUND")],
        ["INTERNAL_ERROR", () => apiError(500, "INTERNAL_ERROR")],
        ["an error body outside the envelope", () => HttpResponse.json({}, { status: 503 })],
        ["a non-JSON body", () => new HttpResponse("<h1>Bad gateway</h1>", { status: 502 })],
        ["a success body failing the schema", () => HttpResponse.json({ id: 1 })],
        ["a dropped connection", () => HttpResponse.error()],
    ])("returns NetworkError on %s", async (_name, respond) => {
        fakeApi("get", "/things/1", respond);

        const result = await apiClient().json("GET", "/things/1", thingSchema, {
            errors: { INSTRUMENT_NOT_FOUND: () => new ThingNotFoundError("1") },
        });

        expect(result._unsafeUnwrapErr()).toMatchObject({ code: "NETWORK_ERROR" });
    });
});

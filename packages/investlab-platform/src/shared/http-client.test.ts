import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { HttpClient } from "./http-client.ts";

const URL = "http://service.test/things";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("HttpClient", () => {
    it("sends the body as JSON with the caller's headers and returns the parsed answer", async () => {
        let received: { body: unknown; contentType: string | null; custom: string | null } | null =
            null;
        server.use(
            http.post(URL, async ({ request }) => {
                received = {
                    body: await request.json(),
                    contentType: request.headers.get("content-type"),
                    custom: request.headers.get("x-custom"),
                };
                return HttpResponse.json({ id: 1 }, { status: 201 });
            }),
        );

        const result = await new HttpClient().request({
            method: "POST",
            url: URL,
            headers: { "X-Custom": "yes" },
            body: { name: "thing" },
        });

        expect(result._unsafeUnwrap()).toEqual({ status: 201, body: { id: 1 } });
        expect(received).toEqual({
            body: { name: "thing" },
            contentType: "application/json",
            custom: "yes",
        });
    });

    it("returns error statuses with their body instead of failing", async () => {
        server.use(http.get(URL, () => HttpResponse.json({ code: "NOPE" }, { status: 404 })));

        const result = await new HttpClient().request({ method: "GET", url: URL });

        expect(result._unsafeUnwrap()).toEqual({ status: 404, body: { code: "NOPE" } });
    });

    it("returns an empty body as undefined", async () => {
        server.use(http.delete(URL, () => new HttpResponse(null, { status: 204 })));

        const result = await new HttpClient().request({ method: "DELETE", url: URL });

        expect(result._unsafeUnwrap()).toEqual({ status: 204, body: undefined });
    });

    it("fails with NetworkError on a body that is not JSON", async () => {
        server.use(http.get(URL, () => new HttpResponse("<h1>Bad gateway</h1>", { status: 502 })));

        const result = await new HttpClient().request({ method: "GET", url: URL });

        expect(result._unsafeUnwrapErr()).toMatchObject({ code: "NETWORK_ERROR" });
    });

    it("fails with NetworkError when the connection drops", async () => {
        server.use(http.get(URL, () => HttpResponse.error()));

        const result = await new HttpClient().request({ method: "GET", url: URL });

        expect(result._unsafeUnwrapErr()).toMatchObject({ code: "NETWORK_ERROR" });
    });

    it("fails with NetworkError when the answer takes longer than the timeout", async () => {
        server.use(
            http.get(URL, async () => {
                await delay(200);
                return HttpResponse.json({});
            }),
        );

        const result = await new HttpClient().request({ method: "GET", url: URL, timeoutMs: 20 });

        expect(result._unsafeUnwrapErr()).toMatchObject({ code: "NETWORK_ERROR" });
    });
});

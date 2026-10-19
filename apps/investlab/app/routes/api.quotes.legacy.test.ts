import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { QUOTE_LIST_MAX_SYMBOLS } from "@m0n0lab/investlab-quotes";
import type { Route } from "./+types/api.quotes";

const TOKEN = "test-token";
const AAPL = {
    symbol: "AAPL",
    price: 190.5,
    change: 1.5,
    changePercent: 0.79,
    updatedAt: "2026-10-12T15:30:00.000Z",
};

const apiRequests: string[] = [];

// Stand-in for apps/investlab-api's `GET /quotes`: only AAPL has data, `CRASH` makes it fail like a 5xx.
const api: Server = createServer((request, response) => {
    apiRequests.push(request.url ?? "");
    const symbols = new URL(request.url ?? "", "http://api").searchParams.get("symbols") ?? "";
    response.setHeader("Content-Type", "application/json");
    if (request.headers.authorization !== `Bearer ${TOKEN}` || symbols.includes("CRASH")) {
        response.statusCode = 500;
        response.end(JSON.stringify({ code: "INTERNAL_ERROR", message: "boom", statusCode: 500 }));
        return;
    }
    response.end(JSON.stringify(symbols.split(",").includes("AAPL") ? [AAPL] : []));
});

beforeAll(async () => {
    await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
    const { port } = api.address() as { port: number };
    process.env["INVESTLAB_API_URL"] = `http://127.0.0.1:${port}`;
    process.env["INVESTLAB_API_TOKEN"] = TOKEN;
});

afterAll(() => new Promise<void>((resolve) => api.close(() => resolve())));

function get(query: string): Route.LoaderArgs {
    return { request: new Request(`http://localhost/api/quotes${query}`) } as Route.LoaderArgs;
}

describe("quotes resource route", () => {
    it("answers the quotes the API has for the requested symbols", async () => {
        const { loader } = await import("./api.quotes");

        const response = await loader(get("?symbols=AAPL,MSFT"));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([AAPL]);
        expect(apiRequests.at(-1)).toBe("/quotes?symbols=AAPL%2CMSFT");
    });

    it("rejects a request without symbols with 422 and never calls the API", async () => {
        const { loader } = await import("./api.quotes");
        const callsBefore = apiRequests.length;

        const response = await loader(get(""));

        expect(response.status).toBe(422);
        expect(apiRequests).toHaveLength(callsBefore);
    });

    it("rejects too many or malformed symbols with 422 and never calls the API", async () => {
        const { loader } = await import("./api.quotes");
        const callsBefore = apiRequests.length;
        const tooMany = Array.from({ length: QUOTE_LIST_MAX_SYMBOLS + 1 }, (_, i) => `S${i}`);

        const manyResponse = await loader(get(`?symbols=${tooMany.join(",")}`));
        const badResponse = await loader(get("?symbols=AAPL,BAD%20SYMBOL"));

        expect(manyResponse.status).toBe(422);
        expect(badResponse.status).toBe(422);
        expect(apiRequests).toHaveLength(callsBefore);
    });

    it("answers 503 when the API cannot be used", async () => {
        const { loader } = await import("./api.quotes");

        const response = await loader(get("?symbols=CRASH"));

        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
            message: "InvestLab service is unavailable. Please try again later.",
        });
    });
});

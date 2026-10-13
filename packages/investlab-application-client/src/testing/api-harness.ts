import { Container } from "inversify";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { DATA_CLIENT_TOKENS, dataClientModule } from "@m0n0lab/investlab-data-client";
import { applicationClientModule } from "../application-client.module.ts";
import type {
    ApiErrorDto,
    InstrumentDto,
    PortfolioItemDto,
    QuoteDto,
} from "@m0n0lab/investlab-data-contracts";

const API_URL = "http://investlab-api.test";
export const API_TOKEN = "s3cret-token";

/** Fake of the investlab API; `onUnhandledRequest: "error"` makes any undeclared call fail the test. */
const server = setupServer();

/** Starts the fake for the calling test file and drops per-test stubs between tests. */
export function useApiFake(): void {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());
}

/** Same composition as the web's `container.server.ts`: real data-client + application-client modules. */
export function createClientContainer(): Container {
    const container = new Container();
    container.bind(DATA_CLIENT_TOKENS.ApiBaseUrl).toConstantValue(API_URL);
    container.bind(DATA_CLIENT_TOKENS.ApiToken).toConstantValue(API_TOKEN);
    container.load(dataClientModule);
    container.load(applicationClientModule);
    return container;
}

export interface RecordedRequest {
    readonly method: string;
    readonly path: string;
    readonly query: Record<string, string>;
    readonly authorization: string | null;
    readonly contentType: string | null;
    readonly body: unknown;
}

type Method = "get" | "post" | "put" | "delete";

/** Answers `method path` with `respond()` and returns the log of every request it received. */
export function stubApi(
    method: Method,
    path: string,
    respond: () => Response | Promise<Response>,
): RecordedRequest[] {
    const received: RecordedRequest[] = [];
    server.use(
        http[method](`${API_URL}${path}`, async ({ request }) => {
            const url = new URL(request.url);
            const text = await request.text();
            received.push({
                method: request.method,
                path: url.pathname,
                query: Object.fromEntries(url.searchParams),
                authorization: request.headers.get("authorization"),
                contentType: request.headers.get("content-type"),
                body: text === "" ? undefined : (JSON.parse(text) as unknown),
            });
            return respond();
        }),
    );
    return received;
}

export function apiError(
    statusCode: number,
    code: ApiErrorDto["code"],
    message: string,
    issues?: ApiErrorDto["issues"],
): Response {
    const body: ApiErrorDto = { code, message, statusCode, ...(issues && { issues }) };
    return HttpResponse.json(body, { status: statusCode });
}

export const INSTRUMENT_ID = "5b0f6f2e-0c1d-4a39-9b36-3f4b2a1c7d10";
export const ITEM_ID = "b3f1a1de-7a9b-4e53-8a49-1f6c1f0a2c01";

export function instrumentDto(overrides: Partial<InstrumentDto> = {}): InstrumentDto {
    return {
        id: INSTRUMENT_ID,
        symbol: "VWCE",
        name: "Vanguard FTSE All-World",
        type: "etf",
        assetClass: "equity",
        exchange: "XETRA",
        quotable: true,
        ...overrides,
    };
}

export function portfolioItemDto(overrides: Partial<PortfolioItemDto> = {}): PortfolioItemDto {
    return {
        id: ITEM_ID,
        instrumentId: INSTRUMENT_ID,
        broker: "Degiro",
        targetWeight: 60,
        currentValue: 1500.5,
        notes: "core holding",
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-02T11:30:00.000Z",
        ...overrides,
    };
}

export function quoteDto(symbol: string, overrides: Partial<QuoteDto> = {}): QuoteDto {
    return {
        symbol,
        price: 101.25,
        change: 1.25,
        changePercent: 1.25,
        updatedAt: "2026-10-12T09:30:00.000Z",
        ...overrides,
    };
}

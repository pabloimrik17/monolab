import { Container } from "inversify";
import { http, HttpResponse, type HttpResponseResolver } from "msw";
import { setupServer } from "msw/node";
import { PLATFORM, platformClientModule } from "@m0n0lab/investlab-platform/client";
import { dataClientModule } from "../data-client.module.ts";
import type { ApiErrorDto } from "@m0n0lab/investlab-core";
import type { InstrumentDto, PortfolioItemDto } from "@m0n0lab/investlab-data-contracts";

const API_URL = "http://api.test";
const API_TOKEN = "s3cret-token";

export const server = setupServer();

/** Fake of the investlab API: answers 401 like the real bearer middleware unless the token matches. */
export function fakeApi(
    method: "get" | "post" | "put" | "delete",
    path: string,
    resolver: HttpResponseResolver,
) {
    return http[method](`${API_URL}${path}`, (info) =>
        info.request.headers.get("authorization") === `Bearer ${API_TOKEN}`
            ? resolver(info)
            : apiError(401, "UNAUTHORIZED", "Invalid or missing bearer token"),
    );
}

export function apiError(
    statusCode: number,
    code: ApiErrorDto["code"],
    message: string,
    issues?: ApiErrorDto["issues"],
) {
    const body: ApiErrorDto = { code, message, statusCode, ...(issues && { issues }) };
    return HttpResponse.json(body, { status: statusCode });
}

export function createTestContainer(baseUrl = API_URL, token = API_TOKEN): Container {
    const container = new Container();
    container.bind(PLATFORM.Config).toConstantValue({ api: { baseUrl, token } });
    container.load(platformClientModule, dataClientModule);
    return container;
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

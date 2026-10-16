import { randomUUID } from "node:crypto";
import { http, HttpResponse } from "msw";
import { afterEach } from "vitest";
import {
    createPortfolioItemDtoSchema,
    updatePortfolioItemDtoSchema,
} from "../../data/contracts/portfolio-item.dto.ts";
import { API_URL, investlabApi } from "./vitest-integration-setup.ts";
import type { InstrumentDto } from "../../data/contracts/instrument.dto.ts";
import type {
    PortfolioItemListDto,
    PortfolioItemWithInstrumentDto,
} from "../../data/contracts/portfolio-item-list.dto.ts";
import type { PortfolioItemDto } from "../../data/contracts/portfolio-item.dto.ts";
import type { ApiErrorDto } from "@m0n0lab/investlab-core";

export const VWCE: InstrumentDto = {
    id: "5b0f6f2e-0c1d-4a39-9b36-3f4b2a1c7d10",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    type: "etf",
    assetClass: "equity",
    exchange: "XETRA",
    replicates: "FTSE All-World",
    quotable: true,
};

export const BITCOIN: InstrumentDto = {
    id: "0c9e8d7b-6a5f-4e3d-8c2b-1a0f9e8d7c6b",
    symbol: "BTC",
    name: "Bitcoin",
    type: "crypto",
    assetClass: "crypto",
    quotable: false,
};

/** A well-formed id nothing in the portfolio or the catalog has. */
export const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

/** A holding of `instrument`, as the service keeps it. */
export function holdingOf(
    instrument: InstrumentDto,
    details: Partial<Omit<PortfolioItemDto, "instrumentId">> = {},
): PortfolioItemWithInstrumentDto {
    return {
        item: {
            id: randomUUID(),
            instrumentId: instrument.id,
            broker: "Degiro",
            targetWeight: 60,
            currentValue: 1500.5,
            createdAt: "2026-10-01T10:00:00.000Z",
            updatedAt: "2026-10-02T11:30:00.000Z",
            ...details,
        },
        instrument,
    };
}

function failure(statusCode: number, code: ApiErrorDto["code"], message: string): Response {
    const body: ApiErrorDto = { code, message, statusCode };
    return HttpResponse.json(body, { status: statusCode });
}

let catalog: InstrumentDto[] = [];
afterEach(() => {
    catalog = [];
});

/** The catalog has these instruments; the service records holdings of them only. */
export function givenCatalog(...instruments: InstrumentDto[]): void {
    catalog = instruments;
    investlabApi.use(
        http.get(`${API_URL}/instruments`, () => HttpResponse.json(instruments)),
        http.post(`${API_URL}/portfolio-items`, async ({ request }) => {
            const { instrumentId, broker, targetWeight, currentValue, notes } =
                createPortfolioItemDtoSchema.parse(await request.json());
            if (!instruments.some((instrument) => instrument.id === instrumentId)) {
                return failure(404, "INSTRUMENT_NOT_FOUND", "Instrument not found");
            }
            const now = new Date().toISOString();
            const recorded: PortfolioItemDto = {
                id: randomUUID(),
                instrumentId,
                broker,
                targetWeight,
                currentValue: currentValue ?? 0,
                ...(notes !== undefined && { notes }),
                createdAt: now,
                updatedAt: now,
            };
            return HttpResponse.json(recorded, { status: 201 });
        }),
    );
}

function changedMeanwhile(): Response {
    return failure(409, "PORTFOLIO_ITEM_CONFLICT", "Portfolio item changed by another request");
}

/** The portfolio holds exactly these holdings; the service changes and removes them only. */
export function givenPortfolioWith(...holdings: PortfolioItemWithInstrumentDto[]): void {
    const held = (id: unknown) => holdings.find(({ item }) => item.id === id)?.item;
    const notHeld = () => failure(404, "PORTFOLIO_ITEM_NOT_FOUND", "Portfolio item not found");
    // Like the API, the list carries the whole catalog next to the holdings.
    const portfolio = (): PortfolioItemListDto => ({
        items: holdings,
        instruments: [...new Set([...catalog, ...holdings.map(({ instrument }) => instrument)])],
    });

    investlabApi.use(
        http.get(`${API_URL}/portfolio-items`, () => HttpResponse.json(portfolio())),
        http.put(`${API_URL}/portfolio-items/:id`, async ({ params, request }) => {
            const item = held(params["id"]);
            if (!item) {
                return notHeld();
            }
            // The web always sends every field; `notes: null` clears the notes.
            const { notes, expectedUpdatedAt, ...changes } = updatePortfolioItemDtoSchema
                .required()
                .parse(await request.json());
            if (expectedUpdatedAt !== item.updatedAt) {
                return changedMeanwhile();
            }
            const { notes: _replaced, ...kept } = item;
            const changed: PortfolioItemDto = {
                ...kept,
                ...changes,
                ...(notes !== null && { notes }),
                updatedAt: new Date().toISOString(),
            };
            return HttpResponse.json(changed);
        }),
        http.delete(`${API_URL}/portfolio-items/:id`, ({ params }) =>
            held(params["id"]) ? new HttpResponse(null, { status: 204 }) : notHeld(),
        ),
    );
}

/** Another request changes every holding between the web's read and its write. */
export function givenChangedMeanwhile(): void {
    investlabApi.use(http.put(`${API_URL}/portfolio-items/:id`, () => changedMeanwhile()));
}

/** The service is up but cannot reach its storage. */
export function givenStorageUnavailable(): void {
    investlabApi.use(
        http.all(`${API_URL}/*`, () => failure(500, "PERSISTENCE_ERROR", "Internal server error")),
    );
}

/** The API cannot be reached. */
export function givenApiUnavailable(): void {
    investlabApi.use(http.all(`${API_URL}/*`, () => HttpResponse.error()));
}

/** The API refuses the web's token. */
export function givenTokenRejected(): void {
    investlabApi.use(
        http.all(`${API_URL}/*`, () =>
            failure(401, "UNAUTHORIZED", "Invalid or missing bearer token"),
        ),
    );
}

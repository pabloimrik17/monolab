import { randomUUID } from "node:crypto";
import { http, HttpResponse } from "msw/http";
import {
    createInstrumentDtoSchema,
    updateInstrumentDtoSchema,
} from "#data/shared/dto/instrument.dto.ts";
import { API_URL, investlabApi } from "./vitest-integration-setup.ts";
import type { InstrumentDto } from "#data/shared/dto/instrument.dto.ts";
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

/** A well-formed id the catalog does not have. */
export const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

function failure(statusCode: number, code: ApiErrorDto["code"], message: string): Response {
    const body: ApiErrorDto = { code, message, statusCode };
    return HttpResponse.json(body, { status: statusCode });
}

/** An instrument as the service changes it: `null` clears an optional field. */
function changeInstrument(instrument: InstrumentDto, body: unknown): InstrumentDto {
    // The web always sends every field.
    const { exchange, sector, replicates, ...changes } = updateInstrumentDtoSchema
        .required()
        .parse(body);
    const { exchange: _exchange, sector: _sector, replicates: _replicates, ...kept } = instrument;
    return {
        ...kept,
        ...changes,
        ...(exchange !== null && { exchange }),
        ...(sector !== null && { sector }),
        ...(replicates !== null && { replicates }),
    };
}

/** The catalog has these instruments, and the service adds, changes and removes them. */
export function givenCatalog(...instruments: InstrumentDto[]): void {
    const listed = (id: unknown) => instruments.find((instrument) => instrument.id === id);
    const notListed = () => failure(404, "INSTRUMENT_NOT_FOUND", "Instrument not found");

    investlabApi.use(
        http.get(`${API_URL}/instruments`, () => HttpResponse.json(instruments)),
        http.post(`${API_URL}/instruments`, async ({ request }) => {
            const { symbol, quotable, ...details } = createInstrumentDtoSchema.parse(
                await request.json(),
            );
            const normalized = symbol.toUpperCase();
            if (instruments.some((instrument) => instrument.symbol === normalized)) {
                return failure(409, "INSTRUMENT_ALREADY_EXISTS", "Instrument already exists");
            }
            const recorded: InstrumentDto = {
                id: randomUUID(),
                symbol: normalized,
                ...details,
                quotable: quotable ?? true,
            };
            return HttpResponse.json(recorded, { status: 201 });
        }),
        http.put(`${API_URL}/instruments/:id`, async ({ params, request }) => {
            const instrument = listed(params["id"]);
            return instrument
                ? HttpResponse.json(changeInstrument(instrument, await request.json()))
                : notListed();
        }),
        http.delete(`${API_URL}/instruments/:id`, ({ params }) =>
            listed(params["id"]) ? new HttpResponse(null, { status: 204 }) : notListed(),
        ),
    );
}

/** Something outside the catalog references `instrument`: the service refuses to remove it. Declare after `givenCatalog`. */
export function givenReferenced(instrument: InstrumentDto): void {
    investlabApi.use(
        http.delete(`${API_URL}/instruments/:id`, ({ params }) =>
            params["id"] === instrument.id
                ? failure(409, "INSTRUMENT_IN_USE", "Instrument is in use")
                : undefined,
        ),
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

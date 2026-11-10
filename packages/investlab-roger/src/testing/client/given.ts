import { randomUUID } from "node:crypto";
import { http, HttpResponse, type HttpResponseResolver } from "msw/http";
import { ZodError } from "zod";
import { entryToDomain } from "#data/client/mapper/entry-dto.mapper.ts";
import {
    createEntryDtoSchema,
    editEntryDtoSchema,
    entryListViewSchema,
    reEnterEntryDtoSchema,
    transitionEntryDtoSchema,
    type EntryDto,
    type EntryWithInstrumentDto,
} from "#data/shared/dto/entry.dto.ts";
import { Entry } from "#domain/model/entry.model.ts";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import { makeEntry } from "#testing/shared/builder/entry.builder.ts";
import { API_URL, investlabApi } from "./vitest-integration-setup.ts";
import type { EntryDraft } from "#domain/model/entry.model.ts";
import type { ApiErrorDto, DomainError } from "@m0n0lab/investlab-core";

export interface FakeInstrument {
    id: string;
    symbol: string;
    name: string;
    sector?: "technology" | "financial";
}

export const AAPL: FakeInstrument = {
    id: "5b0f6f2e-0c1d-4a39-9b36-3f4b2a1c7d10",
    symbol: "AAPL",
    name: "Apple",
    sector: "technology",
};

export const JPM: FakeInstrument = {
    id: "0c9e8d7b-6a5f-4e3d-8c2b-1a0f9e8d7c6b",
    symbol: "JPM",
    name: "JPMorgan Chase",
    sector: "financial",
};

/** A well-formed id the service has no entry or instrument for. */
export const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

function toDto(entry: Entry): EntryDto {
    return {
        id: entry.id,
        instrumentId: entry.instrumentId,
        state: entry.state,
        entryPrice: entry.entryPrice,
        quantity: entry.quantity,
        buyCommission: entry.buyCommission,
        buyDate: entry.buyDate,
        exitPrice: entry.exitPrice,
        sellCommission: entry.sellCommission,
        sellDate: entry.sellDate,
        stateSince: entry.stateSince.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
    };
}

/** An entry of `instrument` as the service lists it, with the fields its state carries. */
export function entryOf(
    instrument: FakeInstrument,
    draft: Partial<EntryDraft> = {},
): EntryWithInstrumentDto {
    const { id: instrumentId, ...shown } = instrument;
    return {
        entry: toDto(makeEntry({ instrumentId, ...draft })),
        instrument: shown,
    };
}

/** The entry as the web read it; `changes` makes the read differ from what the service holds now. */
export function readEntry(
    { entry }: EntryWithInstrumentDto,
    changes: Partial<EntryDto> = {},
): Entry {
    return entryToDomain({ ...entry, ...changes });
}

const STATUS: Record<string, number> = {
    ENTRY_NOT_FOUND: 404,
    ENTRY_CONFLICT: 409,
    INVALID_TRANSITION: 409,
    INSTRUMENT_NOT_FOUND: 404,
    INSTRUMENT_ALREADY_EXISTS: 409,
};
const UNPROCESSABLE = 422;

function failure(code: ApiErrorDto["code"], message: string, field?: string): Response {
    const statusCode = STATUS[code] ?? UNPROCESSABLE;
    const body: ApiErrorDto = {
        code,
        message,
        statusCode,
        ...(field !== undefined && { issues: [{ path: field, message }] }),
    };
    return HttpResponse.json(body, { status: statusCode });
}

/** A body the DTO schemas refuse answers `VALIDATION_ERROR`, as the API does. */
function validating(resolver: HttpResponseResolver): HttpResponseResolver {
    return async (info) => {
        try {
            return await resolver(info);
        } catch (error) {
            if (error instanceof ZodError) {
                return failure("VALIDATION_ERROR", error.message);
            }
            throw error;
        }
    };
}

/** Like the API: the error's code picks the status; the two field errors name their field. */
function refuse(error: DomainError): Response {
    const field = (error as { field?: string }).field;
    return failure(error.code as ApiErrorDto["code"], error.message, field);
}

/**
 * The service holds exactly these entries and applies the roger rules through the domain model;
 * its instruments are those the entries belong to.
 */
export function givenRogerWith(...rows: EntryWithInstrumentDto[]): void {
    const entries = new Map(rows.map(({ entry }) => [entry.id, entryToDomain(entry)]));
    const instruments = new Map(
        rows.map(({ entry, instrument }) => [entry.instrumentId, instrument.symbol]),
    );
    const found = (id: unknown) => entries.get(String(id));
    const notFound = () => failure("ENTRY_NOT_FOUND", "Entry not found");
    const changedMeanwhile = () => failure("ENTRY_CONFLICT", "Entry changed by another request");

    investlabApi.use(
        http.get(`${API_URL}/roger/entries`, ({ request }) => {
            const parsed = entryListViewSchema.safeParse(
                new URL(request.url).searchParams.get("view") ?? undefined,
            );
            if (!parsed.success) {
                return failure("VALIDATION_ERROR", "Unknown view");
            }
            const sold = parsed.data === "history";
            return HttpResponse.json(
                rows.filter(({ entry }) => (entry.state === RogerState.Sold) === sold),
            );
        }),
        http.post(
            `${API_URL}/roger/entries`,
            validating(async ({ request }) => {
                const { instrumentId, newInstrument, ...draft } = createEntryDtoSchema.parse(
                    await request.json(),
                );
                if (instrumentId !== undefined && !instruments.has(instrumentId)) {
                    return failure("INSTRUMENT_NOT_FOUND", "Instrument not found");
                }
                if (newInstrument && [...instruments.values()].includes(newInstrument.symbol)) {
                    return failure("INSTRUMENT_ALREADY_EXISTS", "Instrument already exists");
                }
                const created = Entry.create({
                    ...draft,
                    state: draft.state as RogerState,
                    instrumentId: instrumentId ?? randomUUID(),
                });
                if (created.isErr()) {
                    return refuse(created.error);
                }
                entries.set(created.value.id, created.value);
                return HttpResponse.json(toDto(created.value), { status: 201 });
            }),
        ),
        http.put(
            `${API_URL}/roger/entries/:id`,
            validating(async ({ params, request }) => {
                const entry = found(params["id"]);
                if (!entry) {
                    return notFound();
                }
                const { expectedUpdatedAt, ...values } = editEntryDtoSchema.parse(
                    await request.json(),
                );
                if (expectedUpdatedAt !== entry.updatedAt.toISOString()) {
                    return changedMeanwhile();
                }
                const edited = entry.edit(values);
                return edited.isErr() ? refuse(edited.error) : HttpResponse.json(toDto(entry));
            }),
        ),
        http.post(
            `${API_URL}/roger/entries/:id/transitions`,
            validating(async ({ params, request }) => {
                const entry = found(params["id"]);
                if (!entry) {
                    return notFound();
                }
                const { to, expectedUpdatedAt, ...values } = transitionEntryDtoSchema.parse(
                    await request.json(),
                );
                if (expectedUpdatedAt !== entry.updatedAt.toISOString()) {
                    return changedMeanwhile();
                }
                const moved = entry.transition(to as RogerState, values);
                return moved.isErr() ? refuse(moved.error) : HttpResponse.json(toDto(entry));
            }),
        ),
        http.post(
            `${API_URL}/roger/entries/:id/re-entries`,
            validating(async ({ params, request }) => {
                const entry = found(params["id"]);
                if (!entry) {
                    return notFound();
                }
                const again = entry.reEnter(reEnterEntryDtoSchema.parse(await request.json()));
                if (again.isErr()) {
                    return refuse(again.error);
                }
                entries.set(again.value.id, again.value);
                return HttpResponse.json(toDto(again.value), { status: 201 });
            }),
        ),
        http.delete(`${API_URL}/roger/entries/:id`, ({ params }) =>
            entries.delete(String(params["id"]))
                ? new HttpResponse(null, { status: 204 })
                : notFound(),
        ),
    );
}

/** The API cannot be reached. */
export function givenApiUnavailable(): void {
    investlabApi.use(http.all(`${API_URL}/*`, () => HttpResponse.error()));
}

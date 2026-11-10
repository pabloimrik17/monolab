import { inject, injectable } from "inversify";
import { entryToDomain } from "#data/client/mapper/entry-dto.mapper.ts";
import { entryDtoSchema } from "#data/shared/dto/entry.dto.ts";
import {
    EntryConflictError,
    EntryNotFoundError,
    FieldNotInStateError,
    InvalidTransitionError,
    MissingRequiredFieldError,
} from "#domain/error/entry.error.ts";
import {
    fieldsOf,
    RogerState,
    type EntryField,
} from "#domain/value-object/roger-state.value-object.ts";
import { InstrumentAlreadyExistsError, InstrumentNotFoundError } from "@m0n0lab/investlab-catalog";
import { NetworkError, type ApiErrorDto } from "@m0n0lab/investlab-core";
import { PLATFORM, type InvestlabApiClient } from "@m0n0lab/investlab-platform/client";
import type { RogerRemoteError } from "#domain/error/roger-remote.error.ts";
import type { Entry, EntryValues } from "#domain/model/entry.model.ts";
import type {
    EntryCreateInput,
    EntryRef,
    EntryRemoteRepository,
} from "#domain/repository/entry-remote.repository.ts";
import type { ResultAsync } from "neverthrow";

const ENTRY_FIELDS: readonly string[] = fieldsOf(RogerState.Sold);

function fieldOf(dto: ApiErrorDto): EntryField | undefined {
    const path = dto.issues?.[0]?.path;
    return path !== undefined && ENTRY_FIELDS.includes(path) ? (path as EntryField) : undefined;
}

function missingField(dto: ApiErrorDto): MissingRequiredFieldError | NetworkError {
    const field = fieldOf(dto);
    return field ? new MissingRequiredFieldError(field) : new NetworkError(dto);
}

@injectable()
export class EntryApiRepository implements EntryRemoteRepository {
    constructor(@inject(PLATFORM.InvestlabApiClient) private readonly api: InvestlabApiClient) {}

    create(input: EntryCreateInput): ResultAsync<Entry, RogerRemoteError> {
        return this.api
            .json<typeof entryDtoSchema, RogerRemoteError>(
                "POST",
                "/roger/entries",
                entryDtoSchema,
                {
                    body: input,
                    errors: {
                        INSTRUMENT_NOT_FOUND: (dto) =>
                            "instrumentId" in input
                                ? new InstrumentNotFoundError(input.instrumentId)
                                : new NetworkError(dto),
                        INSTRUMENT_ALREADY_EXISTS: (dto) =>
                            "newInstrument" in input
                                ? new InstrumentAlreadyExistsError(input.newInstrument.symbol)
                                : new NetworkError(dto),
                        MISSING_REQUIRED_FIELD: missingField,
                    },
                },
            )
            .map(entryToDomain);
    }

    edit(current: EntryRef, values: EntryValues): ResultAsync<Entry, RogerRemoteError> {
        return this.api
            .json<typeof entryDtoSchema, RogerRemoteError>(
                "PUT",
                `/roger/entries/${current.id}`,
                entryDtoSchema,
                {
                    body: { ...values, expectedUpdatedAt: current.updatedAt.toISOString() },
                    errors: {
                        ENTRY_NOT_FOUND: () => new EntryNotFoundError(current.id),
                        ENTRY_CONFLICT: () => new EntryConflictError(current.id),
                        MISSING_REQUIRED_FIELD: missingField,
                        FIELD_NOT_IN_STATE: (dto) => {
                            const field = fieldOf(dto);
                            return field
                                ? new FieldNotInStateError(field, current.state)
                                : new NetworkError(dto);
                        },
                    },
                },
            )
            .map(entryToDomain);
    }

    transition(
        current: EntryRef,
        to: RogerState,
        values: EntryValues,
    ): ResultAsync<Entry, RogerRemoteError> {
        return this.api
            .json<typeof entryDtoSchema, RogerRemoteError>(
                "POST",
                `/roger/entries/${current.id}/transitions`,
                entryDtoSchema,
                {
                    body: { ...values, to, expectedUpdatedAt: current.updatedAt.toISOString() },
                    errors: {
                        ENTRY_NOT_FOUND: () => new EntryNotFoundError(current.id),
                        ENTRY_CONFLICT: () => new EntryConflictError(current.id),
                        INVALID_TRANSITION: () => new InvalidTransitionError(current.state, to),
                        MISSING_REQUIRED_FIELD: missingField,
                    },
                },
            )
            .map(entryToDomain);
    }

    reEnter(
        current: Pick<EntryRef, "id" | "state">,
        values: Pick<EntryValues, "entryPrice" | "quantity">,
    ): ResultAsync<Entry, RogerRemoteError> {
        return this.api
            .json<typeof entryDtoSchema, RogerRemoteError>(
                "POST",
                `/roger/entries/${current.id}/re-entries`,
                entryDtoSchema,
                {
                    body: { entryPrice: values.entryPrice, quantity: values.quantity },
                    errors: {
                        ENTRY_NOT_FOUND: () => new EntryNotFoundError(current.id),
                        INVALID_TRANSITION: () => new InvalidTransitionError(current.state),
                        MISSING_REQUIRED_FIELD: missingField,
                    },
                },
            )
            .map(entryToDomain);
    }

    delete(id: string): ResultAsync<void, RogerRemoteError> {
        return this.api.empty<RogerRemoteError>("DELETE", `/roger/entries/${id}`, {
            errors: { ENTRY_NOT_FOUND: () => new EntryNotFoundError(id) },
        });
    }
}

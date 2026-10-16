import { inject, injectable } from "inversify";
import { z } from "zod";
import { PLATFORM, type InvestlabApiClient } from "@m0n0lab/investlab-platform/client";
import {
    InstrumentAlreadyExistsError,
    InstrumentInUseError,
    InstrumentNotFoundError,
    type PortfolioRemoteError,
} from "../../domain/errors.ts";
import { instrumentDtoSchema } from "../contracts/instrument.dto.ts";
import {
    instrumentToCreateDto,
    instrumentToDomain,
    instrumentToUpdateDto,
} from "./instrument.mapper.ts";
import type { Instrument } from "../../domain/entities/instrument.ts";
import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";
import type { ResultAsync } from "neverthrow";

const instrumentListSchema = z.array(instrumentDtoSchema);

@injectable()
export class HttpInstrumentRepository implements InstrumentRepository<PortfolioRemoteError> {
    constructor(@inject(PLATFORM.InvestlabApiClient) private readonly api: InvestlabApiClient) {}

    save(instrument: Instrument): ResultAsync<Instrument, PortfolioRemoteError> {
        return this.api
            .json("POST", "/instruments", instrumentDtoSchema, {
                body: instrumentToCreateDto(instrument),
                errors: {
                    INSTRUMENT_ALREADY_EXISTS: () =>
                        new InstrumentAlreadyExistsError(instrument.symbol),
                },
            })
            .map(instrumentToDomain);
    }

    findById(id: string): ResultAsync<Instrument | null, PortfolioRemoteError> {
        // The API has no single-instrument route; the catalog is the only read model.
        return this.findAll().map(
            (instruments) => instruments.find((instrument) => instrument.id === id) ?? null,
        );
    }

    findAll(): ResultAsync<Instrument[], PortfolioRemoteError> {
        return this.api
            .json("GET", "/instruments", instrumentListSchema)
            .map((dtos) => dtos.map(instrumentToDomain));
    }

    update(instrument: Instrument): ResultAsync<Instrument, PortfolioRemoteError> {
        return this.api
            .json<typeof instrumentDtoSchema, PortfolioRemoteError>(
                "PUT",
                `/instruments/${instrument.id}`,
                instrumentDtoSchema,
                {
                    body: instrumentToUpdateDto(instrument),
                    errors: {
                        INSTRUMENT_NOT_FOUND: () => new InstrumentNotFoundError(instrument.id),
                        INSTRUMENT_ALREADY_EXISTS: () =>
                            new InstrumentAlreadyExistsError(instrument.symbol),
                    },
                },
            )
            .map(instrumentToDomain);
    }

    delete(id: string): ResultAsync<void, PortfolioRemoteError> {
        return this.api.empty<PortfolioRemoteError>("DELETE", `/instruments/${id}`, {
            errors: {
                INSTRUMENT_NOT_FOUND: () => new InstrumentNotFoundError(id),
                INSTRUMENT_IN_USE: () => new InstrumentInUseError(id),
            },
        });
    }
}

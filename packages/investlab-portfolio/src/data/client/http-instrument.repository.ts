// fallow-ignore-file unused-class-member -- `findAll` is called through the client instrument port; `Pick<…>` hides the port name from usedClassMembers
import { inject, injectable } from "inversify";
import { z } from "zod";
import { PLATFORM, type InvestlabApiClient } from "@m0n0lab/investlab-platform/client";
import { instrumentDtoSchema } from "../contracts/instrument.dto.ts";
import { instrumentToDomain } from "./instrument.mapper.ts";
import type { Instrument } from "../../domain/entities/instrument.ts";
import type { PortfolioRemoteError } from "../../domain/errors.ts";
import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";
import type { ResultAsync } from "neverthrow";

const instrumentListSchema = z.array(instrumentDtoSchema);

/** Read-only: the API exposes just the catalog listing, so only `findAll` is implemented. */
@injectable()
export class HttpInstrumentRepository implements Pick<
    InstrumentRepository<PortfolioRemoteError>,
    "findAll"
> {
    constructor(@inject(PLATFORM.InvestlabApiClient) private readonly api: InvestlabApiClient) {}

    findAll(): ResultAsync<Instrument[], PortfolioRemoteError> {
        return this.api
            .json("GET", "/instruments", instrumentListSchema)
            .map((dtos) => dtos.map(instrumentToDomain));
    }
}

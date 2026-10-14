// fallow-ignore-file unused-class-member -- port impl bound in DI, consumed by application-client use cases (task 11.2)
import { inject, injectable } from "inversify";
import { z } from "zod";
import { instrumentDtoSchema } from "@m0n0lab/investlab-data-contracts";
import { PLATFORM, type InvestlabApiClient } from "@m0n0lab/investlab-platform/client";
import { instrumentToDomain } from "../mappers/instrument.mapper.ts";
import type {
    Instrument,
    InstrumentRepository,
    PortfolioRemoteError,
} from "@m0n0lab/investlab-domain";
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

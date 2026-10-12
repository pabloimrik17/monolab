import { inject, injectable } from "inversify";
import { TOKENS, type Instrument, type InstrumentRepository } from "@m0n0lab/investlab-domain";
import type { ClientPortError } from "../client-port-error.ts";
import type { ResultAsync } from "neverthrow";

export type InstrumentListError = ClientPortError;

@injectable()
export class InstrumentListUseCase {
    constructor(
        @inject(TOKENS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository<ClientPortError>,
    ) {}

    execute(): ResultAsync<Instrument[], InstrumentListError> {
        return this.instrumentRepo.findAll();
    }
}

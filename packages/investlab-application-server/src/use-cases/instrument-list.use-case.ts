import { inject, injectable } from "inversify";
import { TOKENS, type Instrument, type InstrumentRepository } from "@m0n0lab/investlab-domain";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

export type InstrumentListError = PersistenceError;

@injectable()
export class InstrumentListUseCase {
    constructor(
        @inject(TOKENS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository,
    ) {}

    execute(): ResultAsync<Instrument[], InstrumentListError> {
        return this.instrumentRepo.findAll();
    }
}

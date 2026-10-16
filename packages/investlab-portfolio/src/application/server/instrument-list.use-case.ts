import { inject, injectable } from "inversify";
import { PORTFOLIO_PORTS } from "./tokens.ts";
import type { Instrument } from "../../domain/entities/instrument.ts";
import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

export type InstrumentListError = PersistenceError;

@injectable()
export class InstrumentListUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository,
    ) {}

    execute(): ResultAsync<Instrument[], InstrumentListError> {
        return this.instrumentRepo.findAll();
    }
}

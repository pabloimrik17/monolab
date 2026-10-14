import { inject, injectable } from "inversify";
import {
    TOKENS,
    type Instrument,
    type InstrumentRepository,
    type PortfolioRemoteError,
} from "@m0n0lab/investlab-domain";
import type { ResultAsync } from "neverthrow";

export type InstrumentListError = PortfolioRemoteError;

@injectable()
export class InstrumentListUseCase {
    constructor(
        @inject(TOKENS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository<PortfolioRemoteError>,
    ) {}

    execute(): ResultAsync<Instrument[], InstrumentListError> {
        return this.instrumentRepo.findAll();
    }
}

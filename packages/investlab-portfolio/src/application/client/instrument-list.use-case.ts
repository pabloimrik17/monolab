import { inject, injectable } from "inversify";
import { PORTFOLIO_PORTS, type InstrumentCatalog } from "./tokens.ts";
import type { Instrument } from "../../domain/entities/instrument.ts";
import type { PortfolioRemoteError } from "../../domain/errors.ts";
import type { ResultAsync } from "neverthrow";

export type InstrumentListError = PortfolioRemoteError;

@injectable()
export class InstrumentListUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentCatalog,
    ) {}

    execute(): ResultAsync<Instrument[], InstrumentListError> {
        return this.instrumentRepo.findAll();
    }
}

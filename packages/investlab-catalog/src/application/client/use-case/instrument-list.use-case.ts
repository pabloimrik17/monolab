import { inject, injectable } from "inversify";
import { CATALOG_PORTS } from "#application/client/tokens.ts";
import type { CatalogRemoteError } from "#domain/error/catalog-remote.error.ts";
import type { Instrument } from "#domain/model/instrument.model.ts";
import type { InstrumentRepository } from "#domain/repository/instrument.repository.ts";
import type { ResultAsync } from "neverthrow";

export type InstrumentListError = CatalogRemoteError;

@injectable()
export class InstrumentListUseCase {
    constructor(
        @inject(CATALOG_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository<CatalogRemoteError>,
    ) {}

    execute(): ResultAsync<Instrument[], InstrumentListError> {
        return this.instrumentRepo.findAll();
    }
}

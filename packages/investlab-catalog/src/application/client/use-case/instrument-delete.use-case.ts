import { inject, injectable } from "inversify";
import { CATALOG_PORTS } from "#application/client/tokens.ts";
import type { CatalogRemoteError } from "#domain/error/catalog-remote.error.ts";
import type { InstrumentRepository } from "#domain/repository/instrument.repository.ts";
import type { ResultAsync } from "neverthrow";

export type InstrumentDeleteError = CatalogRemoteError;

@injectable()
export class InstrumentDeleteUseCase {
    constructor(
        @inject(CATALOG_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository<CatalogRemoteError>,
    ) {}

    // The API refuses an instrument still referenced (INSTRUMENT_IN_USE); the data layer rebuilds the error.
    execute(id: string): ResultAsync<void, InstrumentDeleteError> {
        return this.instrumentRepo.delete(id);
    }
}

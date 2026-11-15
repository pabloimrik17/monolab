import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { CATALOG_PORTS } from "#application/client/tokens.ts";
import { type CatalogRemoteError } from "#domain/error/catalog-remote.error.ts";
import { InstrumentNotFoundError } from "#domain/error/instrument.error.ts";
import type { Instrument, InstrumentChanges } from "#domain/model/instrument.model.ts";
import type { InstrumentRepository } from "#domain/repository/instrument.repository.ts";

export type InstrumentUpdateError = CatalogRemoteError;

@injectable()
export class InstrumentUpdateUseCase {
    constructor(
        @inject(CATALOG_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository<CatalogRemoteError>,
    ) {}

    // fallow-ignore-next-line code-duplication -- client and server use cases stay separate by design (ADR 0001), even when identical
    execute(
        id: string,
        changes: InstrumentChanges,
    ): ResultAsync<Instrument, InstrumentUpdateError> {
        return this.instrumentRepo.findById(id).andThen((instrument) => {
            if (!instrument) {
                return errAsync(new InstrumentNotFoundError(id));
            }

            const updateResult = instrument.update(changes);
            if (updateResult.isErr()) {
                return errAsync(updateResult.error);
            }

            return this.instrumentRepo.update(instrument);
        });
    }
}

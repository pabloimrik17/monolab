import type { InstrumentCreateUseCase } from "#application/client/use-case/instrument-create.use-case.ts";
import type { InstrumentDeleteUseCase } from "#application/client/use-case/instrument-delete.use-case.ts";
import type { InstrumentListUseCase } from "#application/client/use-case/instrument-list.use-case.ts";
import type { InstrumentUpdateUseCase } from "#application/client/use-case/instrument-update.use-case.ts";
import type { CatalogRemoteError } from "#domain/error/catalog-remote.error.ts";
import type { InstrumentRepository } from "#domain/repository/instrument.repository.ts";
import type { ServiceIdentifier } from "inversify";

/** Client use cases of the catalog module. */
export const CATALOG = {
    InstrumentList: Symbol.for(
        "investlab.catalog.client.InstrumentList",
    ) as ServiceIdentifier<InstrumentListUseCase>,
    InstrumentCreate: Symbol.for(
        "investlab.catalog.client.InstrumentCreate",
    ) as ServiceIdentifier<InstrumentCreateUseCase>,
    InstrumentUpdate: Symbol.for(
        "investlab.catalog.client.InstrumentUpdate",
    ) as ServiceIdentifier<InstrumentUpdateUseCase>,
    InstrumentDelete: Symbol.for(
        "investlab.catalog.client.InstrumentDelete",
    ) as ServiceIdentifier<InstrumentDeleteUseCase>,
} as const;

/** Bound by `di/client.module.ts`; never exported from the package. */
export const CATALOG_PORTS = {
    InstrumentRepository: Symbol.for(
        "investlab.catalog.client.InstrumentRepository",
    ) as ServiceIdentifier<InstrumentRepository<CatalogRemoteError>>,
} as const;

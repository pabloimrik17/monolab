import type { InstrumentCreateUseCase } from "#application/server/use-case/instrument-create.use-case.ts";
import type { InstrumentDeleteUseCase } from "#application/server/use-case/instrument-delete.use-case.ts";
import type { InstrumentListUseCase } from "#application/server/use-case/instrument-list.use-case.ts";
import type { InstrumentUpdateUseCase } from "#application/server/use-case/instrument-update.use-case.ts";
import type { InstrumentRepository } from "#domain/repository/instrument.repository.ts";
import type { ServiceIdentifier } from "inversify";

/** Server use cases of the catalog module. */
export const CATALOG = {
    InstrumentList: Symbol.for(
        "investlab.catalog.server.InstrumentList",
    ) as ServiceIdentifier<InstrumentListUseCase>,
    InstrumentCreate: Symbol.for(
        "investlab.catalog.server.InstrumentCreate",
    ) as ServiceIdentifier<InstrumentCreateUseCase>,
    InstrumentUpdate: Symbol.for(
        "investlab.catalog.server.InstrumentUpdate",
    ) as ServiceIdentifier<InstrumentUpdateUseCase>,
    InstrumentDelete: Symbol.for(
        "investlab.catalog.server.InstrumentDelete",
    ) as ServiceIdentifier<InstrumentDeleteUseCase>,
} as const;

/** Bound by `di/server.module.ts`; never exported from the package. */
export const CATALOG_PORTS = {
    InstrumentRepository: Symbol.for(
        "investlab.catalog.server.InstrumentRepository",
    ) as ServiceIdentifier<InstrumentRepository>,
} as const;

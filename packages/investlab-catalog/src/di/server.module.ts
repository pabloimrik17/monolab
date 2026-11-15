import { ContainerModule } from "inversify";
import { CATALOG, CATALOG_PORTS } from "#application/server/tokens.ts";
import { InstrumentCreateUseCase } from "#application/server/use-case/instrument-create.use-case.ts";
import { InstrumentDeleteUseCase } from "#application/server/use-case/instrument-delete.use-case.ts";
import { InstrumentListUseCase } from "#application/server/use-case/instrument-list.use-case.ts";
import { InstrumentUpdateUseCase } from "#application/server/use-case/instrument-update.use-case.ts";
import { InstrumentPgRepository } from "#data/server/repository/instrument-pg.repository.ts";

/** Catalog for the API, on Postgres. Requires `platformServerModule`. */
export const catalogServerModule = new ContainerModule(({ bind }) => {
    bind(CATALOG_PORTS.InstrumentRepository).to(InstrumentPgRepository);
    bind(CATALOG.InstrumentList).to(InstrumentListUseCase);
    bind(CATALOG.InstrumentCreate).to(InstrumentCreateUseCase);
    bind(CATALOG.InstrumentUpdate).to(InstrumentUpdateUseCase);
    bind(CATALOG.InstrumentDelete).to(InstrumentDeleteUseCase);
});

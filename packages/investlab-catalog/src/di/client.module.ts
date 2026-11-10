import { ContainerModule } from "inversify";
import { CATALOG, CATALOG_PORTS } from "#application/client/tokens.ts";
import { InstrumentCreateUseCase } from "#application/client/use-case/instrument-create.use-case.ts";
import { InstrumentDeleteUseCase } from "#application/client/use-case/instrument-delete.use-case.ts";
import { InstrumentListUseCase } from "#application/client/use-case/instrument-list.use-case.ts";
import { InstrumentUpdateUseCase } from "#application/client/use-case/instrument-update.use-case.ts";
import { InstrumentApiRepository } from "#data/client/repository/instrument-api.repository.ts";

/** Catalog for the web, through the InvestLab API. Requires `platformClientModule`. */
export const catalogClientModule = new ContainerModule(({ bind }) => {
    bind(CATALOG_PORTS.InstrumentRepository).to(InstrumentApiRepository);
    bind(CATALOG.InstrumentList).to(InstrumentListUseCase);
    bind(CATALOG.InstrumentCreate).to(InstrumentCreateUseCase);
    bind(CATALOG.InstrumentUpdate).to(InstrumentUpdateUseCase);
    bind(CATALOG.InstrumentDelete).to(InstrumentDeleteUseCase);
});

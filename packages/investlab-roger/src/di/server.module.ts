import { ContainerModule } from "inversify";
import { ROGER, ROGER_PORTS } from "#application/server/tokens.ts";
import { EntryCreateUseCase } from "#application/server/use-case/entry-create.use-case.ts";
import { EntryDeleteUseCase } from "#application/server/use-case/entry-delete.use-case.ts";
import { EntryEditUseCase } from "#application/server/use-case/entry-edit.use-case.ts";
import { EntryListUseCase } from "#application/server/use-case/entry-list.use-case.ts";
import { EntryReEnterUseCase } from "#application/server/use-case/entry-re-enter.use-case.ts";
import { EntryTransitionUseCase } from "#application/server/use-case/entry-transition.use-case.ts";
import { EntryPgQuery } from "#data/server/query/entry-pg.query.ts";
import { EntryPgRepository } from "#data/server/repository/entry-pg.repository.ts";

/** Roger for the API, on Postgres. Requires `platformServerModule` and `catalogServerModule`. */
export const rogerServerModule = new ContainerModule(({ bind }) => {
    bind(ROGER_PORTS.EntryRepository).to(EntryPgRepository);
    bind(ROGER_PORTS.EntryListQuery).to(EntryPgQuery);
    bind(ROGER.EntryCreate).to(EntryCreateUseCase);
    bind(ROGER.EntryEdit).to(EntryEditUseCase);
    bind(ROGER.EntryTransition).to(EntryTransitionUseCase);
    bind(ROGER.EntryReEnter).to(EntryReEnterUseCase);
    bind(ROGER.EntryDelete).to(EntryDeleteUseCase);
    bind(ROGER.EntryList).to(EntryListUseCase);
});

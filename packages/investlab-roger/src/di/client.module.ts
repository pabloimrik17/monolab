// fallow-ignore-file code-duplication -- each side binds the same use-case tokens; the module file is the record of its wiring
import { ContainerModule } from "inversify";
import { ROGER, ROGER_PORTS } from "#application/client/tokens.ts";
import { EntryCreateUseCase } from "#application/client/use-case/entry-create.use-case.ts";
import { EntryDeleteUseCase } from "#application/client/use-case/entry-delete.use-case.ts";
import { EntryEditUseCase } from "#application/client/use-case/entry-edit.use-case.ts";
import { EntryListUseCase } from "#application/client/use-case/entry-list.use-case.ts";
import { EntryReEnterUseCase } from "#application/client/use-case/entry-re-enter.use-case.ts";
import { EntryTransitionUseCase } from "#application/client/use-case/entry-transition.use-case.ts";
import { EntryListApiQuery } from "#data/client/query/entry-list-api.query.ts";
import { EntryApiRepository } from "#data/client/repository/entry-api.repository.ts";

/** Roger for the web, through the InvestLab API. Requires `platformClientModule` and `catalogClientModule`. */
export const rogerClientModule = new ContainerModule(({ bind }) => {
    bind(ROGER_PORTS.EntryRemoteRepository).to(EntryApiRepository);
    bind(ROGER_PORTS.EntryListQuery).to(EntryListApiQuery);
    bind(ROGER.EntryCreate).to(EntryCreateUseCase);
    bind(ROGER.EntryEdit).to(EntryEditUseCase);
    bind(ROGER.EntryTransition).to(EntryTransitionUseCase);
    bind(ROGER.EntryReEnter).to(EntryReEnterUseCase);
    bind(ROGER.EntryDelete).to(EntryDeleteUseCase);
    bind(ROGER.EntryList).to(EntryListUseCase);
});

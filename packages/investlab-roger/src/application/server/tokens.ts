import type { EntryCreateUseCase } from "#application/server/use-case/entry-create.use-case.ts";
import type { EntryDeleteUseCase } from "#application/server/use-case/entry-delete.use-case.ts";
import type { EntryEditUseCase } from "#application/server/use-case/entry-edit.use-case.ts";
import type { EntryListUseCase } from "#application/server/use-case/entry-list.use-case.ts";
import type { EntryReEnterUseCase } from "#application/server/use-case/entry-re-enter.use-case.ts";
import type { EntryTransitionUseCase } from "#application/server/use-case/entry-transition.use-case.ts";
import type { EntryListQuery } from "#domain/query/entry-list.query.ts";
import type { EntryRepository } from "#domain/repository/entry.repository.ts";
import type { ServiceIdentifier } from "inversify";

export const ROGER = {
    EntryCreate: Symbol.for(
        "investlab.roger.server.EntryCreate",
    ) as ServiceIdentifier<EntryCreateUseCase>,
    EntryEdit: Symbol.for(
        "investlab.roger.server.EntryEdit",
    ) as ServiceIdentifier<EntryEditUseCase>,
    EntryTransition: Symbol.for(
        "investlab.roger.server.EntryTransition",
    ) as ServiceIdentifier<EntryTransitionUseCase>,
    EntryReEnter: Symbol.for(
        "investlab.roger.server.EntryReEnter",
    ) as ServiceIdentifier<EntryReEnterUseCase>,
    EntryDelete: Symbol.for(
        "investlab.roger.server.EntryDelete",
    ) as ServiceIdentifier<EntryDeleteUseCase>,
    EntryList: Symbol.for(
        "investlab.roger.server.EntryList",
    ) as ServiceIdentifier<EntryListUseCase>,
} as const;

export const ROGER_PORTS = {
    EntryRepository: Symbol.for(
        "investlab.roger.server.EntryRepository",
    ) as ServiceIdentifier<EntryRepository>,
    EntryListQuery: Symbol.for(
        "investlab.roger.server.EntryListQuery",
    ) as ServiceIdentifier<EntryListQuery>,
} as const;

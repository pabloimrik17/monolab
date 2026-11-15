import type { EntryCreateUseCase } from "#application/client/use-case/entry-create.use-case.ts";
import type { EntryDeleteUseCase } from "#application/client/use-case/entry-delete.use-case.ts";
import type { EntryEditUseCase } from "#application/client/use-case/entry-edit.use-case.ts";
import type { EntryListUseCase } from "#application/client/use-case/entry-list.use-case.ts";
import type { EntryReEnterUseCase } from "#application/client/use-case/entry-re-enter.use-case.ts";
import type { EntryTransitionUseCase } from "#application/client/use-case/entry-transition.use-case.ts";
import type { RogerRemoteError } from "#domain/error/roger-remote.error.ts";
import type { EntryListQuery } from "#domain/query/entry-list.query.ts";
import type { EntryRemoteRepository } from "#domain/repository/entry-remote.repository.ts";
import type { ServiceIdentifier } from "inversify";

export const ROGER = {
    EntryCreate: Symbol.for(
        "investlab.roger.client.EntryCreate",
    ) as ServiceIdentifier<EntryCreateUseCase>,
    EntryEdit: Symbol.for(
        "investlab.roger.client.EntryEdit",
    ) as ServiceIdentifier<EntryEditUseCase>,
    EntryTransition: Symbol.for(
        "investlab.roger.client.EntryTransition",
    ) as ServiceIdentifier<EntryTransitionUseCase>,
    EntryReEnter: Symbol.for(
        "investlab.roger.client.EntryReEnter",
    ) as ServiceIdentifier<EntryReEnterUseCase>,
    EntryDelete: Symbol.for(
        "investlab.roger.client.EntryDelete",
    ) as ServiceIdentifier<EntryDeleteUseCase>,
    EntryList: Symbol.for(
        "investlab.roger.client.EntryList",
    ) as ServiceIdentifier<EntryListUseCase>,
} as const;

export const ROGER_PORTS = {
    EntryRemoteRepository: Symbol.for(
        "investlab.roger.client.EntryRemoteRepository",
    ) as ServiceIdentifier<EntryRemoteRepository>,
    EntryListQuery: Symbol.for("investlab.roger.client.EntryListQuery") as ServiceIdentifier<
        EntryListQuery<RogerRemoteError>
    >,
} as const;

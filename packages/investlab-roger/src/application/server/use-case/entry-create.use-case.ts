import { inject, injectable } from "inversify";
import { okAsync, type ResultAsync } from "neverthrow";
import { ROGER_PORTS } from "#application/server/tokens.ts";
import { Entry, type EntryDraft } from "#domain/model/entry.model.ts";
import { AssetClass, InstrumentType, type Sector } from "@m0n0lab/investlab-catalog";
import {
    CATALOG,
    type InstrumentCreateError,
    type InstrumentCreateUseCase,
} from "@m0n0lab/investlab-catalog/server";
import type { MissingRequiredFieldError } from "#domain/error/entry.error.ts";
import type { EntryRepository } from "#domain/repository/entry.repository.ts";
import type { InstrumentNotFoundError } from "@m0n0lab/investlab-catalog";
import type { PersistenceError, ValidationError } from "@m0n0lab/investlab-core";

export interface NewStock {
    symbol: string;
    name: string;
    sector?: Sector | undefined;
}

export type EntryCreateProps = EntryDraft &
    (
        | { instrumentId: string; newInstrument?: never }
        | { newInstrument: NewStock; instrumentId?: never }
    );

export type EntryCreateError =
    | ValidationError
    | MissingRequiredFieldError
    | InstrumentNotFoundError
    | InstrumentCreateError
    | PersistenceError;

@injectable()
export class EntryCreateUseCase {
    constructor(
        @inject(ROGER_PORTS.EntryRepository)
        private readonly entryRepo: EntryRepository,
        @inject(CATALOG.InstrumentCreate)
        private readonly instrumentCreate: InstrumentCreateUseCase,
    ) {}

    execute(props: EntryCreateProps): ResultAsync<Entry, EntryCreateError> {
        return Entry.validateDraft(props)
            .asyncAndThen(() => this.instrumentIdOf(props))
            .andThen((instrumentId) => Entry.create({ ...props, instrumentId }))
            .andThen((entry) => this.entryRepo.save(entry));
    }

    private instrumentIdOf(props: EntryCreateProps): ResultAsync<string, InstrumentCreateError> {
        if (props.newInstrument === undefined) {
            return okAsync(props.instrumentId);
        }

        return this.instrumentCreate
            .execute({
                ...props.newInstrument,
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
            })
            .map((instrument) => instrument.id);
    }
}

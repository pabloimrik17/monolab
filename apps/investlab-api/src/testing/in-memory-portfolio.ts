import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { PersistenceError } from "@m0n0lab/investlab-core";
import {
    AssetClass,
    Instrument,
    InstrumentAlreadyExistsError,
    InstrumentType,
    type InstrumentRepository,
    type PortfolioItem,
    type PortfolioItemQuery,
    type PortfolioItemRepository,
    type PortfolioItemWithInstrument,
} from "@m0n0lab/investlab-portfolio";
import type { Quote, QuoteRepository } from "@m0n0lab/investlab-quotes";

function detached(instrument: Instrument): Instrument {
    const { id, symbol, name, type, assetClass, exchange, sector, replicates, quotable } =
        instrument;
    return Instrument.reconstitute({
        id,
        symbol,
        name,
        type,
        assetClass,
        exchange,
        sector,
        replicates,
        quotable,
    });
}

export class InMemoryInstrumentRepository implements InstrumentRepository {
    readonly store = new Map<string, Instrument>();

    /** Like the unique symbol constraint: another instrument with the symbol refuses the write. */
    save(instrument: Instrument) {
        const taken = [...this.store.values()].some(
            ({ id, symbol }) => symbol === instrument.symbol && id !== instrument.id,
        );
        if (taken) {
            return errAsync(new InstrumentAlreadyExistsError(instrument.symbol));
        }
        this.store.set(instrument.id, instrument);
        return okAsync(instrument);
    }
    /** Like rows from the database: a caller's changes reach the store only through a write. */
    findById(id: string) {
        const instrument = this.store.get(id);
        return okAsync(instrument ? detached(instrument) : null);
    }
    findAll() {
        return okAsync([...this.store.values()].map(detached));
    }
    update(instrument: Instrument) {
        return this.save(instrument);
    }
    delete(id: string) {
        this.store.delete(id);
        return okAsync(undefined);
    }
}

export class InMemoryPortfolioItemRepository implements PortfolioItemRepository {
    readonly store = new Map<string, PortfolioItem>();
    failure: PersistenceError | undefined;

    private guard<T>(value: () => T): ResultAsync<T, PersistenceError> {
        return this.failure ? errAsync(this.failure) : okAsync(value());
    }

    save(item: PortfolioItem) {
        return this.guard(() => {
            this.store.set(item.id, item);
            return item;
        });
    }
    findById(id: string) {
        return this.guard(() => this.store.get(id) ?? null);
    }
    findAll() {
        return this.guard(() => [...this.store.values()]);
    }
    update(item: PortfolioItem) {
        return this.save(item);
    }
    delete(id: string) {
        return this.guard(() => {
            this.store.delete(id);
        });
    }
    existsForInstrument(instrumentId: string) {
        return this.guard(() =>
            [...this.store.values()].some((item) => item.instrumentId === instrumentId),
        );
    }
}

export class InMemoryPortfolioItemQuery implements PortfolioItemQuery {
    constructor(
        private readonly items: InMemoryPortfolioItemRepository,
        private readonly instruments: InMemoryInstrumentRepository,
    ) {}

    listWithInstruments() {
        return this.items.findAll().map((items) =>
            items
                .map((item): PortfolioItemWithInstrument | undefined => {
                    const instrument = this.instruments.store.get(item.instrumentId);
                    return instrument && { item, instrument };
                })
                .filter((row): row is PortfolioItemWithInstrument => row !== undefined)
                .sort((a, b) => a.item.createdAt.getTime() - b.item.createdAt.getTime()),
        );
    }
}

export class InMemoryQuoteRepository implements QuoteRepository {
    readonly store = new Map<string, Quote>();
    readonly requested: string[][] = [];
    failure: PersistenceError | undefined;

    getQuote(symbol: string) {
        const quote = this.store.get(symbol);
        return quote ? okAsync(quote) : errAsync(new PersistenceError(new Error("No quote")));
    }
    getQuotes(symbols: string[]) {
        this.requested.push(symbols);
        if (this.failure) return errAsync(this.failure);
        return okAsync(
            new Map(
                symbols.flatMap((symbol) => {
                    const quote = this.store.get(symbol);
                    return quote ? [[symbol, quote] as const] : [];
                }),
            ),
        );
    }
}

export function makeInstrument(symbol = "SPY"): Instrument {
    const created = Instrument.create({
        symbol,
        name: `${symbol} fund`,
        type: InstrumentType.ETF,
        assetClass: AssetClass.Equity,
    });
    if (created.isErr()) throw created.error;
    return created.value;
}

// fallow-ignore-file unused-class-member -- fakes implement domain port interfaces, called through them by the use cases
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import {
    AssetClass,
    Instrument,
    InstrumentType,
    type InstrumentRepository,
    PersistenceError,
    type PortfolioItem,
    type PortfolioItemQuery,
    type PortfolioItemRepository,
    type PortfolioItemWithInstrument,
    type Quote,
    type QuoteRepository,
} from "@m0n0lab/investlab-domain";

export class InMemoryInstrumentRepository implements InstrumentRepository {
    readonly store = new Map<string, Instrument>();

    save(instrument: Instrument) {
        this.store.set(instrument.id, instrument);
        return okAsync(instrument);
    }
    findById(id: string) {
        return okAsync(this.store.get(id) ?? null);
    }
    findBySymbol(symbol: string) {
        return okAsync([...this.store.values()].find((i) => i.symbol === symbol) ?? null);
    }
    findAll() {
        return okAsync([...this.store.values()]);
    }
    findByType(type: InstrumentType) {
        return okAsync([...this.store.values()].filter((i) => i.type === type));
    }
    findByAssetClass(assetClass: AssetClass) {
        return okAsync([...this.store.values()].filter((i) => i.assetClass === assetClass));
    }
    update(instrument: Instrument) {
        return this.save(instrument);
    }
    delete(id: string) {
        this.store.delete(id);
        return okAsync(undefined);
    }
    upsertBySymbol(instrument: Instrument) {
        return this.save(instrument);
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

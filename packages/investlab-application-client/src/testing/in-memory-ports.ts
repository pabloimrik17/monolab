import { errAsync, okAsync } from "neverthrow";
import type {
    Instrument,
    InstrumentRepository,
    NetworkError,
    PortfolioItem,
    PortfolioItemRepository,
    Quote,
    QuoteRepository,
} from "@m0n0lab/investlab-domain";

// Stand-ins until §14.3 rewrites these tests against the real data-client + MSW.
export function inMemoryPortfolioItemRepo(seed: PortfolioItem[] = []): PortfolioItemRepository {
    const items = new Map(seed.map((item) => [item.id, item]));
    return {
        save: (item) => {
            items.set(item.id, item);
            return okAsync(item);
        },
        findById: (id) => okAsync(items.get(id) ?? null),
        findAll: () => okAsync([...items.values()]),
        update: (item) => {
            items.set(item.id, item);
            return okAsync(item);
        },
        delete: (id) => {
            items.delete(id);
            return okAsync(undefined);
        },
    };
}

export function failingPortfolioItemRepo(error: NetworkError): PortfolioItemRepository {
    return {
        save: () => errAsync(error),
        findById: () => errAsync(error),
        findAll: () => errAsync(error),
        update: () => errAsync(error),
        delete: () => errAsync(error),
    } as unknown as PortfolioItemRepository;
}

export function inMemoryInstrumentRepo(seed: Instrument[] = []): InstrumentRepository {
    return {
        findAll: () => okAsync([...seed]),
        findById: (id: string) => okAsync(seed.find((i) => i.id === id) ?? null),
    } as unknown as InstrumentRepository;
}

export function inMemoryQuoteRepo(quotes: Quote[] = []): QuoteRepository {
    return {
        getQuote: (symbol: string) => okAsync(quotes.find((q) => q.symbol === symbol) as Quote),
        getQuotes: (symbols: string[]) =>
            okAsync(
                new Map(quotes.filter((q) => symbols.includes(q.symbol)).map((q) => [q.symbol, q])),
            ),
    };
}

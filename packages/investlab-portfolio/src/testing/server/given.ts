import pg from "pg";
import { PORTFOLIO } from "#application/server/tokens.ts";
import { AssetClass, InstrumentType } from "@m0n0lab/investlab-catalog";
import { CATALOG } from "@m0n0lab/investlab-catalog/server";
import { PLATFORM } from "@m0n0lab/investlab-platform/server";
import { container } from "./vitest-integration-setup.ts";
import type { PortfolioItem } from "#domain/model/portfolio-item.model.ts";
import type { PortfolioItemWithInstrument } from "#domain/read-model/portfolio-item-with-instrument.read-model.ts";
import type { Instrument } from "@m0n0lab/investlab-catalog";

/** A well-formed id nothing in the portfolio or the catalog has. */
export const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

/** What the catalog holds now. */
export async function catalog(): Promise<Instrument[]> {
    return (await container.get(CATALOG.InstrumentList).execute())._unsafeUnwrap();
}

/** The catalog has an instrument with this symbol: the seeded one, or an equity ETF added for the test. */
export async function givenInstrument(symbol: string): Promise<Instrument> {
    const known = (await catalog()).find((instrument) => instrument.symbol === symbol);
    if (known) {
        return known;
    }
    const created = await container.get(CATALOG.InstrumentCreate).execute({
        symbol,
        name: `${symbol} Fund`,
        type: InstrumentType.ETF,
        assetClass: AssetClass.Equity,
    });
    return created._unsafeUnwrap();
}

interface Holding {
    readonly broker?: string;
    readonly targetWeight?: number;
    readonly notes?: string;
}

/** The portfolio holds `instrument` at a broker. */
export async function givenHolding(
    instrument: Instrument,
    { broker = "MyInvestor", targetWeight = 10, notes }: Holding = {},
): Promise<PortfolioItem> {
    const created = await container.get(PORTFOLIO.ItemCreate).execute({
        instrumentId: instrument.id,
        broker,
        targetWeight,
        ...(notes !== undefined && { notes }),
    });
    return created._unsafeUnwrap();
}

/** What the portfolio holds now, each holding with its instrument. */
export async function portfolio(): Promise<PortfolioItemWithInstrument[]> {
    return (await container.get(PORTFOLIO.ItemList).execute())._unsafeUnwrap().items;
}

/** The database itself stamped the holding's last change, at a precision finer than a JS Date. */
export async function givenStampedByDatabase(holding: PortfolioItem): Promise<PortfolioItem> {
    const client = new pg.Client({
        connectionString: container.get(PLATFORM.Config).database.url,
    });
    await client.connect();
    try {
        await client.query(
            "UPDATE portfolio_items SET updated_at = date_trunc('milliseconds', now()) + interval '123 microseconds' WHERE id = $1",
            [holding.id],
        );
    } finally {
        await client.end();
    }
    return (await portfolio()).find(({ item }) => item.id === holding.id)!.item;
}

import { eq, sql } from "drizzle-orm";
import { PLATFORM } from "@m0n0lab/investlab-platform/server";
import { portfolioItems } from "../../data/server/schema.ts";
import { Instrument } from "../../domain/entities/instrument.ts";
import { AssetClass } from "../../domain/value-objects/asset-class.ts";
import { InstrumentType } from "../../domain/value-objects/instrument-type.ts";
import { PORTFOLIO, PORTFOLIO_PORTS } from "./tokens.ts";
import { container } from "./vitest-integration-setup.ts";
import type { PortfolioItem } from "../../domain/entities/portfolio-item.ts";
import type { PortfolioItemWithInstrument } from "../../domain/read-models/portfolio-item-with-instrument.ts";

/** A well-formed id nothing in the portfolio or the catalog has. */
export const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

/**
 * The catalog has an equity ETF with this symbol. No public use case adds instruments yet,
 * so this is the one place that writes through the module's own repository.
 */
export async function givenInstrument(symbol: string): Promise<Instrument> {
    const catalog = (await container.get(PORTFOLIO.InstrumentList).execute())._unsafeUnwrap();
    const known = catalog.find((instrument) => instrument.symbol === symbol);
    if (known) {
        return known;
    }
    const instrument = Instrument.create({
        symbol,
        name: `${symbol} Fund`,
        type: InstrumentType.ETF,
        assetClass: AssetClass.Equity,
    })._unsafeUnwrap();
    return (
        await container.get(PORTFOLIO_PORTS.InstrumentRepository).save(instrument)
    )._unsafeUnwrap();
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
    (
        await container.get(PLATFORM.Db).update((tx) =>
            tx
                .update(portfolioItems)
                .set({
                    updatedAt: sql`date_trunc('milliseconds', now()) + interval '123 microseconds'`,
                })
                .where(eq(portfolioItems.id, holding.id)),
        )
    )._unsafeUnwrap();
    return (await portfolio()).find(({ item }) => item.id === holding.id)!.item;
}

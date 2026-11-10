import { CATALOG } from "#application/server/tokens.ts";
import { AssetClass } from "#domain/value-object/asset-class.value-object.ts";
import { InstrumentType } from "#domain/value-object/instrument-type.value-object.ts";
import { container } from "./vitest-integration-setup.ts";
import type { Instrument } from "#domain/model/instrument.model.ts";

/** A well-formed id the catalog does not have. */
export const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

/** Symbols the seeded catalog starts with. */
export const SEEDED_SYMBOLS = [
    "AAPL",
    "MSFT",
    "NVDA",
    "AMZN",
    "GOOGL",
    "META",
    "TSLA",
    "SPY",
    "QQQ",
    "VTI",
] as const;

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

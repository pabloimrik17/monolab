import pg from "pg";
import { ROGER, ROGER_PORTS } from "#application/server/tokens.ts";
import { makeEntry } from "#testing/shared/builder/entry.builder.ts";
import { AssetClass, InstrumentType } from "@m0n0lab/investlab-catalog";
import { CATALOG } from "@m0n0lab/investlab-catalog/server";
import { PLATFORM } from "@m0n0lab/investlab-platform/server";
import { container } from "./vitest-integration-setup.ts";
import type { Entry, EntryDraft } from "#domain/model/entry.model.ts";
import type { EntryWithInstrument } from "#domain/read-model/entry-with-instrument.read-model.ts";
import type { Instrument } from "@m0n0lab/investlab-catalog";

/** A well-formed id nothing in Roger or the catalog has. */
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

/** Roger holds an entry for `instrument`, valid for its state (default `WATCHING`). */
export async function givenEntry(
    instrument: Instrument,
    overrides: Partial<EntryDraft> = {},
): Promise<Entry> {
    const saved = await container
        .get(ROGER_PORTS.EntryRepository)
        .save(makeEntry({ ...overrides, instrumentId: instrument.id }));
    return saved._unsafeUnwrap();
}

/** How a list shows `instrument`. */
export function listed(instrument: Instrument): EntryWithInstrument["instrument"] {
    return { symbol: instrument.symbol, name: instrument.name, sector: instrument.sector };
}

/** Everything Roger holds now: active entries, then history. */
export async function entries(): Promise<EntryWithInstrument[]> {
    const list = container.get(ROGER.EntryList);
    const active = (await list.execute("active"))._unsafeUnwrap();
    const history = (await list.execute("history"))._unsafeUnwrap();
    return [...active, ...history];
}

/** Writes `state` to the entry's row, past the model. */
export async function writeStateToRow(id: string, state: string): Promise<void> {
    const client = new pg.Client({
        connectionString: container.get(PLATFORM.Config).database.url,
    });
    await client.connect();
    try {
        await client.query("UPDATE roger_entries SET state = $1 WHERE id = $2", [state, id]);
    } finally {
        await client.end();
    }
}

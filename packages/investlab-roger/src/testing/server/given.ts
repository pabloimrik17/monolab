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

export const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

export async function catalog(): Promise<Instrument[]> {
    return (await container.get(CATALOG.InstrumentList).execute())._unsafeUnwrap();
}

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

export async function givenEntry(
    instrument: Instrument,
    overrides: Partial<EntryDraft> = {},
): Promise<Entry> {
    const saved = await container
        .get(ROGER_PORTS.EntryRepository)
        .save(makeEntry({ ...overrides, instrumentId: instrument.id }));
    return saved._unsafeUnwrap();
}

export function listed(instrument: Instrument): EntryWithInstrument["instrument"] {
    return { symbol: instrument.symbol, name: instrument.name, sector: instrument.sector };
}

export async function entries(): Promise<EntryWithInstrument[]> {
    const list = container.get(ROGER.EntryList);
    const active = (await list.execute("active"))._unsafeUnwrap();
    const history = (await list.execute("history"))._unsafeUnwrap();
    return [...active, ...history];
}

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

import type { Entry } from "#domain/model/entry.model.ts";
import type { Sector } from "@m0n0lab/investlab-catalog";

export interface EntryWithInstrument {
    entry: Entry;
    instrument: {
        symbol: string;
        name: string;
        sector?: Sector | undefined;
    };
}

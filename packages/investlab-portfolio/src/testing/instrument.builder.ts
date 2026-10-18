import { Instrument, type InstrumentDraft } from "../domain/entities/instrument.ts";
import { AssetClass } from "../domain/value-objects/asset-class.ts";
import { InstrumentType } from "../domain/value-objects/instrument-type.ts";

/** A valid instrument for tests; `overrides` replace the defaults field by field. */
export function makeInstrument(overrides: Partial<InstrumentDraft> = {}): Instrument {
    const symbol = overrides.symbol ?? "SPY";
    const created = Instrument.create({
        symbol,
        name: `${symbol} fund`,
        type: InstrumentType.ETF,
        assetClass: AssetClass.Equity,
        ...overrides,
    });
    if (created.isErr()) throw created.error;
    return created.value;
}

import { Instrument, type InstrumentDraft } from "#domain/model/instrument.model.ts";
import { AssetClass } from "#domain/value-object/asset-class.value-object.ts";
import { InstrumentType } from "#domain/value-object/instrument-type.value-object.ts";

export function makeInstrument(overrides: Partial<InstrumentDraft> = {}): Instrument {
    const symbol = overrides.symbol ?? "SPY";
    return Instrument.create({
        symbol,
        name: `${symbol} fund`,
        type: InstrumentType.ETF,
        assetClass: AssetClass.Equity,
        ...overrides,
    })._unsafeUnwrap();
}

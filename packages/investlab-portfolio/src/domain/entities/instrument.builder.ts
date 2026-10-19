import { AssetClass } from "../value-objects/asset-class.ts";
import { InstrumentType } from "../value-objects/instrument-type.ts";
import { Instrument, type InstrumentDraft } from "./instrument.ts";

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

import { describe, expect, it } from "vitest";
import { AssetClass, Instrument, InstrumentType } from "@m0n0lab/investlab-domain";
import { inMemoryInstrumentRepo } from "../testing/in-memory-ports.ts";
import { InstrumentListUseCase } from "./instrument-list.use-case.ts";

describe("InstrumentListUseCase", () => {
    it("lists instruments", async () => {
        const instrument = Instrument.create({
            symbol: "SPY",
            name: "SPDR S&P 500 ETF",
            type: InstrumentType.ETF,
            assetClass: AssetClass.Equity,
        })._unsafeUnwrap();

        const result = await new InstrumentListUseCase(
            inMemoryInstrumentRepo([instrument]),
        ).execute();

        expect(result._unsafeUnwrap()).toEqual([instrument]);
    });
});

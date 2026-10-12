import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import {
    AssetClass,
    Instrument,
    InstrumentType,
    NetworkError,
    PortfolioItem,
    type PortfolioItemQuery,
} from "@m0n0lab/investlab-domain";
import { inMemoryInstrumentRepo } from "../testing/in-memory-ports.ts";
import { PortfolioItemListUseCase } from "./portfolio-item-list.use-case.ts";

const instrument = Instrument.create({
    symbol: "SPY",
    name: "SPDR S&P 500 ETF",
    type: InstrumentType.ETF,
    assetClass: AssetClass.Equity,
})._unsafeUnwrap();

describe("PortfolioItemListUseCase", () => {
    it("combines items and instruments", async () => {
        const item = PortfolioItem.create({
            instrumentId: instrument.id,
            broker: "MyInvestor",
            targetWeight: 10,
        })._unsafeUnwrap();
        const query: PortfolioItemQuery = {
            listWithInstruments: () => okAsync([{ item, instrument }]),
        };

        const result = await new PortfolioItemListUseCase(
            query,
            inMemoryInstrumentRepo([instrument]),
        ).execute();

        expect(result._unsafeUnwrap()).toEqual({
            items: [{ item, instrument }],
            instruments: [instrument],
        });
    });

    it("propagates NetworkError", async () => {
        const query = {
            listWithInstruments: () => errAsync(new NetworkError("offline")),
        } as unknown as PortfolioItemQuery;

        const result = await new PortfolioItemListUseCase(
            query,
            inMemoryInstrumentRepo(),
        ).execute();

        expect(result._unsafeUnwrapErr().code).toBe("NETWORK_ERROR");
    });
});

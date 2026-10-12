import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import {
    AssetClass,
    Instrument,
    InstrumentType,
    PersistenceError,
    type InstrumentRepository,
} from "@m0n0lab/investlab-domain";
import { InstrumentListUseCase } from "./instrument-list.use-case.ts";

function makeInstrumentRepo(overrides: Partial<InstrumentRepository> = {}): InstrumentRepository {
    return {
        save: vi.fn(),
        findById: vi.fn(),
        findBySymbol: vi.fn(),
        findAll: vi.fn(),
        findByType: vi.fn(),
        findByAssetClass: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsertBySymbol: vi.fn(),
        ...overrides,
    };
}

describe("InstrumentListUseCase", () => {
    it("returns the instrument catalog", async () => {
        const created = Instrument.create({
            symbol: "SPY",
            name: "SPDR",
            type: InstrumentType.ETF,
            assetClass: AssetClass.Equity,
        });
        if (!created.isOk()) throw new Error("setup");
        const repo = makeInstrumentRepo({ findAll: vi.fn(() => okAsync([created.value])) });

        const result = await new InstrumentListUseCase(repo).execute();

        expect(result._unsafeUnwrap()).toEqual([created.value]);
    });

    it("propagates a persistence failure", async () => {
        const failure = new PersistenceError(new Error("connection lost"));
        const repo = makeInstrumentRepo({ findAll: vi.fn(() => errAsync(failure)) });

        const result = await new InstrumentListUseCase(repo).execute();

        expect(result._unsafeUnwrapErr()).toBe(failure);
    });
});

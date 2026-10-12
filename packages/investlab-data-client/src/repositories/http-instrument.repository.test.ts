import { HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TOKENS, type InstrumentRepository } from "@m0n0lab/investlab-domain";
import { createTestContainer, fakeApi, instrumentDto, server } from "../testing/api-server.ts";
import type { ApiClientError } from "../api-client-error.ts";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("HttpInstrumentRepository", () => {
    it("lists the instrument catalog as entities", async () => {
        server.use(
            fakeApi("get", "/instruments", () =>
                HttpResponse.json([
                    instrumentDto(),
                    instrumentDto({
                        id: "0e8f0c5e-6b9a-4d77-8f0a-52f2c8a6b9a1",
                        symbol: "BTC",
                        name: "Bitcoin",
                        type: "crypto",
                        assetClass: "crypto",
                        quotable: false,
                    }),
                ]),
            ),
        );
        const repository = createTestContainer().get<
            Pick<InstrumentRepository<ApiClientError>, "findAll">
        >(TOKENS.InstrumentRepository);

        const instruments = (await repository.findAll())._unsafeUnwrap();

        expect(instruments.map((instrument) => instrument.symbol)).toEqual(["VWCE", "BTC"]);
        expect(instruments[0]?.exchange).toBe("XETRA");
        expect(instruments[1]?.quotable).toBe(false);
    });
});

import { HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
    NetworkError,
    PersistenceError,
    TOKENS,
    type RemotePortError,
    UnauthorizedError,
} from "@m0n0lab/investlab-domain";
import {
    apiError,
    createTestContainer,
    fakeApi,
    instrumentDto,
    portfolioItemDto,
    server,
} from "../testing/api-server.ts";
import type { PortfolioItemQuery } from "@m0n0lab/investlab-domain";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function createQuery(...args: Parameters<typeof createTestContainer>) {
    return createTestContainer(...args).get<PortfolioItemQuery<RemotePortError>>(
        TOKENS.PortfolioItemQuery,
    );
}

describe("HttpPortfolioItemQuery", () => {
    it("rebuilds items paired with their instruments from the API list", async () => {
        const instrument = instrumentDto();
        server.use(
            fakeApi("get", "/portfolio-items", () =>
                HttpResponse.json({
                    items: [{ item: portfolioItemDto(), instrument }],
                    instruments: [instrument],
                }),
            ),
        );

        const result = await createQuery().listWithInstruments();

        const [row] = result._unsafeUnwrap();
        expect(row?.item.id).toBe(portfolioItemDto().id);
        expect(row?.item.currentValue).toBe(1500.5);
        expect(row?.item.createdAt).toEqual(new Date("2026-10-01T10:00:00.000Z"));
        expect(row?.instrument.symbol).toBe("VWCE");
        expect(row?.instrument.exchange).toBe("XETRA");
    });

    it("tolerates a trailing slash in the base URL", async () => {
        server.use(
            fakeApi("get", "/portfolio-items", () =>
                HttpResponse.json({ items: [], instruments: [] }),
            ),
        );

        const result = await createQuery("http://api.test/").listWithInstruments();

        expect(result._unsafeUnwrap()).toEqual([]);
    });

    it("maps a wrong token (UNAUTHORIZED) to UnauthorizedError", async () => {
        server.use(
            fakeApi("get", "/portfolio-items", () =>
                HttpResponse.json({ items: [], instruments: [] }),
            ),
        );

        const result = await createQuery(undefined, "wrong").listWithInstruments();

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnauthorizedError);
    });

    it("maps PERSISTENCE_ERROR to PersistenceError", async () => {
        server.use(
            fakeApi("get", "/portfolio-items", () =>
                apiError(500, "PERSISTENCE_ERROR", "Internal server error"),
            ),
        );

        const result = await createQuery().listWithInstruments();

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(PersistenceError);
    });

    it("maps a dropped connection to NetworkError", async () => {
        server.use(fakeApi("get", "/portfolio-items", () => HttpResponse.error()));

        const result = await createQuery().listWithInstruments();

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(NetworkError);
    });

    it("maps a body that breaks the contract to NetworkError", async () => {
        server.use(fakeApi("get", "/portfolio-items", () => HttpResponse.json({ items: "nope" })));

        const result = await createQuery().listWithInstruments();

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(NetworkError);
    });

    it("maps a non-JSON error response (gateway) to NetworkError", async () => {
        server.use(
            fakeApi("get", "/portfolio-items", () =>
                HttpResponse.text("Bad Gateway", { status: 502 }),
            ),
        );

        const result = await createQuery().listWithInstruments();

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(NetworkError);
    });
});

import { Container, type ServiceIdentifier } from "inversify";
import { afterAll, beforeAll, beforeEach } from "vitest";
import {
    dataModule,
    instruments,
    portfolioDataModule,
    portfolioItems,
} from "@m0n0lab/investlab-data-server";
import {
    AssetClass,
    Instrument,
    InstrumentType,
    PortfolioItem,
    TOKENS,
    type InstrumentRepository,
    type PortfolioItemRepository,
} from "@m0n0lab/investlab-domain";
import {
    PLATFORM,
    platformServerModule,
    type ServerConfig,
} from "@m0n0lab/investlab-platform/server";
import { portfolioModule } from "../portfolio.module.ts";
import { fileUrls } from "./vitest-integration-setup.ts";
import type { Result } from "neverthrow";

/** Postgres URL nothing listens on, to drive the persistence-failure paths. */
const UNREACHABLE_DATABASE_URL = "postgres://investlab:investlab@127.0.0.1:1/investlab";

/** A well-formed id no row has; the API rejects malformed ids before any use case runs. */
export const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

export interface IntegrationHarness {
    get<T>(id: ServiceIdentifier<T>): T;
    seedInstrument(symbol?: string): Promise<Instrument>;
    seedPortfolioItem(props: {
        instrumentId: string;
        targetWeight?: number;
        notes?: string;
    }): Promise<PortfolioItem>;
}

interface OwnedHarness extends IntegrationHarness {
    reset(): Promise<void>;
    close(): Promise<void>;
}

function unwrap<T>(result: Result<T, Error>): T {
    if (result.isErr()) throw result.error;
    return result.value;
}

/** The file's own database and Redis logical database; Finnhub is faked with MSW. */
function testConfig(databaseUrl: string): ServerConfig {
    return {
        database: { url: databaseUrl },
        redis: { url: fileUrls.redisUrl },
        finnhub: { apiKey: "test-finnhub-key" },
        api: { port: 3002, token: "test-api-token" },
    };
}

/** Same wiring as the investlab-api composition root, with a constant `Config`. */
function createHarness(databaseUrl: string): OwnedHarness {
    const container = new Container();
    container.bind(PLATFORM.Config).toConstantValue(testConfig(databaseUrl));
    container.load(platformServerModule, dataModule, portfolioDataModule, portfolioModule);

    return {
        get: (id) => container.get(id),
        async seedInstrument(symbol = "SPY") {
            const instrument = unwrap(
                Instrument.create({
                    symbol,
                    name: `${symbol} Fund`,
                    type: InstrumentType.ETF,
                    assetClass: AssetClass.Equity,
                }),
            );
            return unwrap(
                await container
                    .get<InstrumentRepository>(TOKENS.InstrumentRepository)
                    .save(instrument),
            );
        },
        async seedPortfolioItem({ instrumentId, targetWeight = 10, notes }) {
            const item = unwrap(
                PortfolioItem.create({
                    instrumentId,
                    broker: "MyInvestor",
                    targetWeight,
                    ...(notes !== undefined && { notes }),
                }),
            );
            return unwrap(
                await container
                    .get<PortfolioItemRepository>(TOKENS.PortfolioItemRepository)
                    .save(item),
            );
        },
        async reset() {
            const db = container.get(PLATFORM.Db);
            unwrap(await db.delete((tx) => tx.delete(portfolioItems)));
            unwrap(await db.delete((tx) => tx.delete(instruments)));
            await container.get(PLATFORM.Redis).flushdb();
        },
        // Deactivation ends the pool and the Redis connection.
        close: () => container.unbindAllAsync(),
    };
}

/** Registers the file's hooks: one harness per file, emptied before each test. */
export function useIntegrationHarness(): IntegrationHarness {
    let harness: OwnedHarness | undefined;
    const current = (): OwnedHarness => {
        if (!harness) throw new Error("integration harness used outside a test");
        return harness;
    };

    beforeAll(() => {
        harness = createHarness(fileUrls.databaseUrl);
    });
    beforeEach(() => current().reset());
    afterAll(() => harness?.close());

    return {
        get: (id) => current().get(id),
        seedInstrument: (symbol) => current().seedInstrument(symbol),
        seedPortfolioItem: (props) => current().seedPortfolioItem(props),
    };
}

/** Resolves a use case from a container whose database is down. */
export async function withUnreachableDatabase<T>(
    id: ServiceIdentifier<T>,
    run: (resolved: T) => Promise<void>,
): Promise<void> {
    const offline = createHarness(UNREACHABLE_DATABASE_URL);
    try {
        await run(offline.get(id));
    } finally {
        await offline.close();
    }
}

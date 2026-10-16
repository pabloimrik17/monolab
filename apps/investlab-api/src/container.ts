import { drizzle } from "drizzle-orm/node-postgres";
import { Container } from "inversify";
import Redis from "ioredis";
import pg from "pg";
import { portfolioModule } from "@m0n0lab/investlab-application-server";
import {
    createFinnhubQuoteDatasource,
    DATA_TOKENS,
    dataModule,
    portfolioDataModule,
    quoteDataModule,
} from "@m0n0lab/investlab-data-server";

interface ApiEnv {
    readonly databaseUrl: string;
    readonly redisUrl: string;
    readonly finnhubApiKey: string;
}

const REQUIRED_VARS = ["DATABASE_URL", "REDIS_URL", "FINNHUB_API_KEY"] as const;

export function readApiEnv(env: Record<string, string | undefined>): ApiEnv {
    const missing = REQUIRED_VARS.filter((name) => !env[name]);
    if (missing.length > 0) {
        throw new Error(`Missing env vars: ${missing.join(", ")}`);
    }
    return {
        databaseUrl: env["DATABASE_URL"]!,
        redisUrl: env["REDIS_URL"]!,
        finnhubApiKey: env["FINNHUB_API_KEY"]!,
    };
}

/** Clients connect on first use, so building the container opens no connection. */
export function createContainer({ databaseUrl, redisUrl, finnhubApiKey }: ApiEnv): Container {
    const container = new Container();

    const pool = new pg.Pool({ connectionString: databaseUrl });
    container.bind(DATA_TOKENS.DrizzleDb).toConstantValue(drizzle(pool));
    container.bind(DATA_TOKENS.Redis).toConstantValue(new Redis(redisUrl, { lazyConnect: true }));
    container
        .bind(DATA_TOKENS.FinnhubQuoteDatasource)
        .toConstantValue(createFinnhubQuoteDatasource(finnhubApiKey));

    container.load(dataModule);
    container.load(portfolioDataModule);
    container.load(quoteDataModule);
    container.load(portfolioModule);

    return container;
}

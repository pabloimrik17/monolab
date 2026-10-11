import { drizzle } from "drizzle-orm/node-postgres";
import { Container } from "inversify";
import Redis from "ioredis";
import pg from "pg";
import { portfolioModule } from "@m0n0lab/investlab-application-server";
import { CORE_TOKENS, coreModule, createFinnhubClient } from "@m0n0lab/investlab-core";
import { DATA_TOKENS, dataModule, portfolioDataModule } from "@m0n0lab/investlab-data-server";

let singleton: Container | null = null;

export function getContainer(): Container {
    if (singleton === null) {
        singleton = createContainer();
    }
    return singleton;
}

function createContainer(): Container {
    const container = new Container();

    // Database
    const databaseUrl = process.env["DATABASE_URL"];
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is required");
    }
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const db = drizzle(pool);
    container.bind(DATA_TOKENS.DrizzleDb).toConstantValue(db);

    // Redis
    const redisUrl = process.env["REDIS_URL"];
    if (!redisUrl) {
        throw new Error("REDIS_URL is required");
    }
    const redis = new Redis(redisUrl);
    container.bind(CORE_TOKENS.Redis).toConstantValue(redis);

    // Finnhub
    const finnhubApiKey = process.env["FINNHUB_API_KEY"];
    if (!finnhubApiKey) {
        throw new Error("FINNHUB_API_KEY is required");
    }
    const finnhub = createFinnhubClient(finnhubApiKey);
    container.bind(CORE_TOKENS.FinnhubClient).toConstantValue(finnhub);

    // Modules
    container.load(dataModule);
    container.load(coreModule);
    container.load(portfolioModule);
    container.load(portfolioDataModule);

    return container;
}

import { drizzle } from "drizzle-orm/node-postgres";
import { Container } from "inversify";
// @ts-expect-error no types for pg
import pg from "pg";
import { DATA_TOKENS, dataModule } from "@m0n0lab/qup-data";
import { domainModule } from "@m0n0lab/qup-domain";
import { apiModule } from "./api.module.ts";

export function createContainer(): Container {
    const container = new Container();

    // Database
    const pool = new pg.Pool({ connectionString: process.env["DATABASE_URL"] });
    const db = drizzle(pool);
    container.bind(DATA_TOKENS.DrizzleDb).toConstantValue(db);

    container.load(domainModule);
    container.load(dataModule);
    container.load(apiModule);

    return container;
}

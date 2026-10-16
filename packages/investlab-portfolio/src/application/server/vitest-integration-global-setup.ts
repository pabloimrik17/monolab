import { PostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";
import { migrate } from "@m0n0lab/investlab-database";
import type { TestProject } from "vitest/node";

declare module "vitest" {
    export interface ProvidedContext {
        databaseUrl: string;
        templateDatabase: string;
    }
}

/** Database every test clones (`CREATE DATABASE ... TEMPLATE`), so tests never share rows. */
const TEMPLATE_DATABASE = "investlab_template";

/** Starts Postgres once per run and migrates the template database. Portfolio uses no Redis. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
    const postgres = await new PostgreSqlContainer("postgres:17-alpine").start();
    const serverUrl = postgres.getConnectionUri();

    const admin = new pg.Client({ connectionString: serverUrl });
    await admin.connect();
    try {
        await admin.query(`CREATE DATABASE ${TEMPLATE_DATABASE}`);
    } finally {
        await admin.end();
    }
    const templateUrl = new URL(serverUrl);
    templateUrl.pathname = `/${TEMPLATE_DATABASE}`;
    await migrate(templateUrl.toString());

    project.provide("databaseUrl", serverUrl);
    project.provide("templateDatabase", TEMPLATE_DATABASE);

    return async () => {
        await postgres.stop();
    };
}

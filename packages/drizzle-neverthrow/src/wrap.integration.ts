import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { wrap } from "./wrap.ts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const items = pgTable("items", {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
});

class PersistenceError extends Error {
    constructor(readonly original: unknown) {
        super("persistence failed");
    }
}

describe("wrap against Postgres", () => {
    let container: StartedPostgreSqlContainer;
    let pool: Pool;
    let db: NodePgDatabase;

    beforeAll(async () => {
        container = await new PostgreSqlContainer("postgres:17-alpine").start();
        pool = new Pool({ connectionString: container.getConnectionUri() });
        db = drizzle(pool);
    });

    afterAll(async () => {
        await pool.end();
        await container.stop();
    });

    beforeEach(async () => {
        await pool.query("DROP TABLE IF EXISTS items");
        await pool.query("CREATE TABLE items (id serial PRIMARY KEY, name text NOT NULL UNIQUE)");
    });

    const client = () => wrap(db, { toError: (cause) => new PersistenceError(cause) });

    it("inserts with returning", async () => {
        const result = await client().insert((tx) =>
            tx.insert(items).values({ name: "alpha" }).returning(),
        );

        expect(result._unsafeUnwrap()).toEqual([{ id: 1, name: "alpha" }]);
    });

    it("selects rows", async () => {
        await db.insert(items).values([{ name: "alpha" }, { name: "beta" }]);

        const result = await client().select((tx) => tx.select().from(items).orderBy(items.id));

        expect(result._unsafeUnwrap()).toEqual([
            { id: 1, name: "alpha" },
            { id: 2, name: "beta" },
        ]);
    });

    it("selects distinct rows", async () => {
        await db.insert(items).values([{ name: "alpha" }, { name: "beta" }]);

        const result = await client().select((tx) =>
            tx.selectDistinct({ name: items.name }).from(items).orderBy(items.name),
        );

        expect(result._unsafeUnwrap()).toEqual([{ name: "alpha" }, { name: "beta" }]);
    });

    it("updates with returning", async () => {
        await db.insert(items).values({ name: "alpha" });

        const result = await client().update((tx) =>
            tx.update(items).set({ name: "omega" }).where(eq(items.name, "alpha")).returning(),
        );

        expect(result._unsafeUnwrap()).toEqual([{ id: 1, name: "omega" }]);
    });

    it("deletes with returning", async () => {
        await db.insert(items).values({ name: "alpha" });

        const result = await client().delete((tx) =>
            tx.delete(items).where(eq(items.name, "alpha")).returning(),
        );

        expect(result._unsafeUnwrap()).toEqual([{ id: 1, name: "alpha" }]);
        expect(await db.select().from(items)).toEqual([]);
    });

    it("maps a database error through the error factory", async () => {
        await db.insert(items).values({ name: "alpha" });

        const result = await client().insert((tx) =>
            tx.insert(items).values({ name: "alpha" }).returning(),
        );

        const error = result._unsafeUnwrapErr();
        expect(error).toBeInstanceOf(PersistenceError);
        expect(error.original).toBeInstanceOf(Error);
    });
});

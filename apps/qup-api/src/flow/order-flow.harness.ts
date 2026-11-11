import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { ApiHarness, start, type EventStream, type Started } from "../harness/api.harness.ts";
import type { MenuItemDto, OrderDto, SessionDto } from "@m0n0lab/qup-shared";

const MIGRATIONS = join(
    dirname(createRequire(import.meta.url).resolve("@m0n0lab/qup-data/package.json")),
    "drizzle",
);

async function migrateDatabase(url: string): Promise<void> {
    const db = drizzle(url);
    try {
        await migrate(db, { migrationsFolder: MIGRATIONS });
    } finally {
        await db.$client.end();
    }
}

/**
 * The API with nothing faked: real use cases and qup-data repositories on a migrated Postgres
 * from Testcontainers, started per harness and stopped on close.
 */
export class OrderFlowHarness extends ApiHarness {
    static override async launch<H extends ApiHarness>(
        this: new (started: Started) => H,
    ): Promise<H> {
        const postgres = await new PostgreSqlContainer("postgres:17-alpine").start();
        const release = async () => {
            await postgres.stop();
        };
        try {
            await migrateDatabase(postgres.getConnectionUri());
            return await start(this, {
                databaseUrl: postgres.getConnectionUri(),
                guarded: false,
                release,
            });
        } catch (error) {
            await release();
            throw error;
        }
    }

    addMenuItem(body: unknown) {
        return this.reply<MenuItemDto>(this.adminJson("/menu", "POST", body));
    }

    openSession(name: string) {
        return this.reply<SessionDto>(this.adminJson("/sessions", "POST", { name }));
    }

    watchSession(code: string): Promise<EventStream> {
        return this.stream(`/events/sessions/${code}`);
    }

    placeOrder(body: unknown) {
        return this.reply<OrderDto>(this.json("/orders", "POST", body));
    }

    updateStatus(id: string, status: string) {
        return this.reply<{ ok: boolean }>(
            this.adminJson(`/orders/${id}/status`, "PATCH", { status }),
        );
    }

    sessionOrders(id: string) {
        return this.reply<OrderDto[]>(this.request(`/sessions/${id}/orders`));
    }
}

import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate as runMigrations } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

// `../drizzle` is right from both `src/` and `dist/`, so the folder never depends on the caller.
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

/** Applies the pending migrations to the database at `databaseUrl`. */
export async function migrate(databaseUrl: string): Promise<void> {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    try {
        await runMigrations(drizzle(pool), { migrationsFolder });
    } finally {
        await pool.end();
    }
}

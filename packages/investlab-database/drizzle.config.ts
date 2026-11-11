import { defineConfig } from "drizzle-kit";

// The API owns the database. Run via the package scripts: `varlock run` injects
// DATABASE_URL from apps/investlab-api/.env.schema.
const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
    throw new Error(
        "DATABASE_URL is not set; run via `pnpm db:migrate` / `pnpm db:generate` (Varlock)",
    );
}

// drizzle-kit 0.31 catches a failed command (e.g. a table file that won't load), logs the
// error and exits 0; fail the run instead.
const logError = console.error.bind(console);
console.error = (...args: unknown[]) => {
    if (args[0] instanceof Error) process.exitCode = 1;
    logError(...args);
};

export default defineConfig({
    dialect: "postgresql",
    schema: ["../investlab-*/src/data/server/infra/db/*.table.ts"],
    out: "./drizzle",
    dbCredentials: {
        url: databaseUrl,
    },
});

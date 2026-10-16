import { defineConfig } from "drizzle-kit";

// The API owns the database. Run via the package scripts: `varlock run` injects
// DATABASE_URL from apps/investlab-api/.env.schema.
const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
    throw new Error(
        "DATABASE_URL is not set; run via `pnpm db:migrate` / `pnpm db:generate` (Varlock)",
    );
}

export default defineConfig({
    dialect: "postgresql",
    schema: ["../investlab-portfolio/src/data/server/schema.ts"],
    out: "./drizzle",
    dbCredentials: {
        url: databaseUrl,
    },
});

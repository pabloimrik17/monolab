import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// The API owns the database; migrations read its env.
const appEnvFile = "../../apps/investlab-api/.env";
if (existsSync(appEnvFile)) process.loadEnvFile(appEnvFile);

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/schema/index.ts",
    out: "./drizzle",
    dbCredentials: {
        url: process.env["DATABASE_URL"]!,
    },
});

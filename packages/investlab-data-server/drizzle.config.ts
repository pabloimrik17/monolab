import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

const appEnvFile = "../../apps/investlab/.env";
if (existsSync(appEnvFile)) process.loadEnvFile(appEnvFile);

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/schema/index.ts",
    out: "./drizzle",
    dbCredentials: {
        url: process.env["DATABASE_URL"]!,
    },
});

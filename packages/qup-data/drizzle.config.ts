import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/schema/index.ts",
    out: "./drizzle",
    dbCredentials: {
        url: process.env["DATABASE_URL"] ?? "postgres://qup:qup@localhost:5432/qup",
    },
});

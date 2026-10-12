import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import type * as HttpClientEntry from "./index.ts";

// Resolves the build through package.json "exports", the way consumers import it.
async function importBuiltEntry(): Promise<typeof HttpClientEntry> {
    const packageJsonUrl = new URL("../package.json", import.meta.url);
    const { exports } = JSON.parse(await readFile(packageJsonUrl, "utf8")) as {
        exports: { ".": { import: string } };
    };
    const entryPath = fileURLToPath(new URL(exports["."].import, packageJsonUrl));
    return (await import(entryPath)) as typeof HttpClientEntry;
}

it("lets consumers of the built package classify HTTP errors", async () => {
    const { HttpError, HttpResponseError, HttpServiceUnavailableError } = await importBuiltEntry();

    const error: unknown = new HttpServiceUnavailableError(
        "Service Unavailable",
        "Service Unavailable",
        { reason: "maintenance" },
        { "retry-after": "120" },
        { baseUrl: "https://api.example.com" },
    );

    expect(error).toBeInstanceOf(HttpResponseError);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
        name: "HttpServiceUnavailableError",
        status: 503,
        data: { reason: "maintenance" },
        headers: { "retry-after": "120" },
    });
});

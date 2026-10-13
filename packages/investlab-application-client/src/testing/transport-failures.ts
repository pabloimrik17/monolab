import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { apiError, stubApi } from "./api-harness.ts";
import type { RemotePortError } from "@m0n0lab/investlab-domain";
import type { ResultAsync } from "neverthrow";

interface Endpoint {
    readonly method: "get" | "post" | "put" | "delete";
    readonly path: string;
}

interface TransportFailureOptions {
    /** A 200 body that violates the response schema; omit for endpoints answering 204. */
    readonly malformedBody?: unknown;
}

/** Failures that mean "the API is unusable for this client": the use case must surface a NetworkError. */
export function describeTransportFailures(
    endpoint: Endpoint,
    run: () => ResultAsync<unknown, RemotePortError>,
    { malformedBody }: TransportFailureOptions = {},
): void {
    const cases: Array<readonly [string, () => Response]> = [
        ["500 INTERNAL_ERROR", () => apiError(500, "INTERNAL_ERROR", "Internal server error")],
        ["a non-JSON error body", () => new HttpResponse("<h1>Bad gateway</h1>", { status: 502 })],
        [
            "an error body outside the wire contract",
            () => HttpResponse.json({ oops: true }, { status: 503 }),
        ],
        ["a dropped connection", () => HttpResponse.error()],
        ...(malformedBody === undefined
            ? []
            : [
                  [
                      "a 200 body that violates the response schema",
                      () => HttpResponse.json(malformedBody),
                  ] as const,
              ]),
    ];

    describe("rejected token", () => {
        it("returns UnauthorizedError on 401 UNAUTHORIZED", async () => {
            stubApi(endpoint.method, endpoint.path, () =>
                apiError(401, "UNAUTHORIZED", "Invalid or missing bearer token"),
            );

            const result = await run();

            expect(result._unsafeUnwrapErr()).toMatchObject({
                code: "UNAUTHORIZED",
                name: "UnauthorizedError",
            });
        });
    });

    describe("transport failures", () => {
        it.each(cases)("returns NetworkError on %s", async (_name, respond) => {
            stubApi(endpoint.method, endpoint.path, respond);

            const result = await run();

            expect(result._unsafeUnwrapErr()).toMatchObject({
                code: "NETWORK_ERROR",
                name: "NetworkError",
            });
        });
    });
}

import { inject, injectable } from "inversify";
import { err, ok, ResultAsync, type Result } from "neverthrow";
import { apiErrorDtoSchema } from "@m0n0lab/investlab-data-contracts";
import { NetworkError, type RemotePortError } from "@m0n0lab/investlab-domain";
import { apiErrorToDomain } from "./api-error.mapper.ts";
import { DATA_CLIENT_TOKENS } from "./tokens.ts";
import type { z } from "zod";

interface RequestOptions {
    readonly body?: unknown;
    /** Id of the entity the request targets, used to rebuild `*_NOT_FOUND` errors. */
    readonly resourceId?: string;
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

/** Bearer-authenticated fetch against the investlab API; every failure comes back as a typed error. */
@injectable()
export class ApiClient {
    private readonly baseUrl: string;

    constructor(
        @inject(DATA_CLIENT_TOKENS.ApiBaseUrl) baseUrl: string,
        @inject(DATA_CLIENT_TOKENS.ApiToken) private readonly token: string,
    ) {
        this.baseUrl = baseUrl.replace(/\/+$/, "");
    }

    json<S extends z.ZodTypeAny>(
        method: Method,
        path: string,
        schema: S,
        options: RequestOptions = {},
    ): ResultAsync<z.infer<S>, RemotePortError> {
        return this.exchange(method, path, options).andThen((payload) =>
            parseWith(schema, payload),
        );
    }

    empty(
        method: Method,
        path: string,
        options: RequestOptions = {},
    ): ResultAsync<void, RemotePortError> {
        return this.exchange(method, path, options).map(() => undefined);
    }

    private exchange(
        method: Method,
        path: string,
        { body, resourceId = "" }: RequestOptions,
    ): ResultAsync<unknown, RemotePortError> {
        return ResultAsync.fromPromise(
            fetch(`${this.baseUrl}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    ...(body !== undefined && { "Content-Type": "application/json" }),
                },
                ...(body !== undefined && { body: JSON.stringify(body) }),
            }),
            (cause) => new NetworkError(cause),
        ).andThen((response) => {
            if (response.status === 204) {
                return ok(undefined);
            }
            return ResultAsync.fromPromise(
                response.json() as Promise<unknown>,
                (cause) => new NetworkError(cause),
            ).andThen((payload): Result<unknown, RemotePortError> => {
                if (response.ok) {
                    return ok(payload);
                }
                const apiError = apiErrorDtoSchema.safeParse(payload);
                return err(
                    apiError.success
                        ? apiErrorToDomain(apiError.data, resourceId)
                        : new NetworkError(`HTTP ${response.status}`),
                );
            });
        });
    }
}

function parseWith<S extends z.ZodTypeAny>(
    schema: S,
    payload: unknown,
): Result<z.infer<S>, NetworkError> {
    const parsed = schema.safeParse(payload);
    return parsed.success ? ok(parsed.data) : err(new NetworkError(parsed.error));
}

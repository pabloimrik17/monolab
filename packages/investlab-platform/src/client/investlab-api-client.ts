import { inject, injectable } from "inversify";
import { err, ok, type Result, type ResultAsync } from "neverthrow";
import {
    apiErrorDtoSchema,
    NetworkError,
    PersistenceError,
    UnauthorizedError,
    ValidationError,
    type ApiErrorCode,
    type ApiErrorDto,
    type KernelErrorCode,
    type RemotePortError,
} from "@m0n0lab/investlab-core";
import { PLATFORM } from "./tokens.ts";
import type { HttpClient, HttpMethod } from "../shared/http-client.ts";
import type { ClientConfig } from "./config.ts";
import type { z } from "zod";

/** Wire codes a module rebuilds itself; kernel codes, `UNAUTHORIZED` and `INTERNAL_ERROR` are the platform's. */
export type ModuleErrorCode = Exclude<
    ApiErrorCode,
    KernelErrorCode | "UNAUTHORIZED" | "INTERNAL_ERROR"
>;

/** The caller's code → error factories. A key outside `ModuleErrorCode` is a type error; unmapped codes become `NetworkError`. */
export type ApiErrorMap<E> = { readonly [Code in ModuleErrorCode]?: (error: ApiErrorDto) => E };

export interface ApiCallOptions<E> {
    readonly body?: unknown;
    readonly errors?: ApiErrorMap<E>;
    /** Overrides `HttpClient`'s default timeout, for endpoints that wait on slower services. */
    readonly timeoutMs?: number;
}

const HTTP_UNAUTHORIZED = 401;

/** The InvestLab API over `HttpClient`: base URL and bearer token from `Config`, error envelopes rebuilt as errors. */
@injectable()
export class InvestlabApiClient {
    private readonly baseUrl: string;
    private readonly token: string;

    constructor(
        @inject(PLATFORM.Config) config: ClientConfig,
        @inject(PLATFORM.HttpClient) private readonly http: HttpClient,
    ) {
        this.baseUrl = config.api.baseUrl.replace(/\/+$/, "");
        this.token = config.api.token;
    }

    /** A JSON success body, validated with `schema`; a body failing it is a `NetworkError`. */
    json<S extends z.ZodTypeAny, E = never>(
        method: HttpMethod,
        path: string,
        schema: S,
        options: ApiCallOptions<E> = {},
    ): ResultAsync<z.infer<S>, E | RemotePortError> {
        return this.exchange(method, path, options).andThen((body) => {
            const parsed = schema.safeParse(body);
            return parsed.success
                ? ok<z.infer<S>>(parsed.data)
                : err(new NetworkError(parsed.error));
        });
    }

    /** A success whose body, if any, the caller does not need. */
    empty<E = never>(
        method: HttpMethod,
        path: string,
        options: ApiCallOptions<E> = {},
    ): ResultAsync<void, E | RemotePortError> {
        return this.exchange(method, path, options).map(() => undefined);
    }

    private exchange<E>(
        method: HttpMethod,
        path: string,
        { body, errors = {}, timeoutMs }: ApiCallOptions<E>,
    ): ResultAsync<unknown, E | RemotePortError> {
        return this.http
            .request({
                method,
                url: `${this.baseUrl}${path}`,
                headers: { Authorization: `Bearer ${this.token}` },
                body,
                ...(timeoutMs !== undefined && { timeoutMs }),
            })
            .andThen(({ status, body: payload }): Result<unknown, E | RemotePortError> => {
                if (status >= 200 && status < 300) {
                    return ok(payload);
                }
                if (status === HTTP_UNAUTHORIZED) {
                    return err(new UnauthorizedError(payload));
                }
                const envelope = apiErrorDtoSchema.safeParse(payload);
                return err(
                    envelope.success
                        ? toError(envelope.data, errors)
                        : new NetworkError(`HTTP ${status}`),
                );
            });
    }
}

function toError<E>(dto: ApiErrorDto, errors: ApiErrorMap<E>): E | RemotePortError {
    switch (dto.code) {
        case "PERSISTENCE_ERROR":
            return new PersistenceError(dto);
        case "VALIDATION_ERROR":
            return new ValidationError(dto.message);
        case "UNAUTHORIZED":
        case "INTERNAL_ERROR":
            return new NetworkError(dto);
        default: {
            const factory = errors[dto.code];
            return factory ? factory(dto) : new NetworkError(dto);
        }
    }
}

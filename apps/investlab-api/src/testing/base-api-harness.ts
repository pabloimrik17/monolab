import { serve, type ServerType } from "@hono/node-server";
import { apiErrorDtoSchema, type ApiErrorDto } from "@m0n0lab/investlab-core";
import { PLATFORM, type ServerConfig } from "@m0n0lab/investlab-platform/server";
import { createApp } from "../app.ts";
import { createContainer } from "../container.ts";
import type { Container, ServiceIdentifier } from "inversify";
import type { ZodType, ZodTypeDef } from "zod";

/** Stands in for `ProcessEnvConfig`; the guards make sure no URL is ever dialled. */
const TEST_CONFIG: ServerConfig = {
    database: { url: "postgres://boundary/guarded" },
    redis: { url: "redis://boundary/guarded" },
    finnhub: { apiKey: "guarded" },
    api: { port: 0, token: "s3cret-token" },
};

type Execute<T> = T extends { execute: (...args: infer A) => infer R }
    ? { args: A; result: R }
    : never;
type ExecuteArgs<T> = Execute<T>["args"];
type ExecuteResult<T> = Execute<T>["result"];

export interface FakeUseCase<T> {
    readonly calls: ExecuteArgs<T>[];
}

/** A route's answer read as the wire contract: its DTO on 2xx (`undefined` on 204), else the error envelope. */
export interface ApiReply<T> {
    readonly status: number;
    readonly body: T | ApiErrorDto;
}

/** Strict, so a cause leaked into an extra field fails the parse instead of being stripped. */
const ERROR_ENVELOPE = apiErrorDtoSchema.strict();

export interface ErrorLog {
    readonly calls: unknown[][];
}

class RecordingUseCase<T> implements FakeUseCase<T> {
    readonly calls: ExecuteArgs<T>[] = [];

    constructor(private readonly answer: () => ExecuteResult<T>) {}

    execute(...args: ExecuteArgs<T>): ExecuteResult<T> {
        this.calls.push(args);
        return this.answer();
    }
}

/** A platform port nothing may reach: first use throws, and `onBreach` fails the request instead of waiting on a connection. */
function boundaryGuard<T>(port: string, onBreach: (error: Error) => void): T {
    return new Proxy(
        {},
        {
            get(_target, property) {
                // Inversify and the test runner probe symbols and `then`; a port's API is a string key.
                if (typeof property === "symbol" || property === "then") {
                    return undefined;
                }
                const error = new Error(`system boundary reached: ${port}`);
                onBreach(error);
                throw error;
            },
        },
    ) as T;
}

type Fetch = Parameters<typeof serve>[0]["fetch"];

function listen(fetch: Fetch): Promise<{ server: ServerType; url: string }> {
    return new Promise((resolve) => {
        const server = serve({ fetch, hostname: "127.0.0.1", port: 0 }, ({ port }) =>
            resolve({ server, url: `http://127.0.0.1:${port}` }),
        );
    });
}

export interface LaunchOptions {
    /** Bearer token the API expects; an empty string configures none. */
    readonly token?: string;
}

export interface RequestOptions {
    readonly method?: string;
    readonly headers?: Readonly<Record<string, string>>;
    readonly body?: string;
}

interface Started {
    readonly container: Container;
    readonly server: ServerType;
    readonly url: string;
    readonly token: string;
    readonly breaches: Error[];
}

/**
 * The API launched for real from its own composition root on a loopback port. Use cases the test
 * arranges through `fake()` answer in its place; the platform ports behind them are guarded, so
 * an unarranged use case fails the request instead of reaching Postgres, Redis or Finnhub.
 * The only test code that knows hono, @hono/node-server or inversify.
 */
export class BaseApiHarness implements AsyncDisposable {
    readonly url: string;
    private readonly container: Container;
    private readonly server: ServerType;
    private readonly token: string;
    private readonly breaches: Error[];
    private errorLog: (ErrorLog & { readonly restore: () => void }) | undefined;
    private closed = false;

    constructor({ container, server, url, token, breaches }: Started) {
        this.container = container;
        this.server = server;
        this.url = url;
        this.token = token;
        this.breaches = breaches;
    }

    static async launch<H extends BaseApiHarness>(
        this: new (started: Started) => H,
        options: LaunchOptions = {},
    ): Promise<H> {
        const token = options.token ?? TEST_CONFIG.api.token;
        const breaches: Error[] = [];
        const breach = (error: Error) => breaches.push(error);

        const container = createContainer();
        container
            .rebind(PLATFORM.Config)
            .toConstantValue({ ...TEST_CONFIG, api: { ...TEST_CONFIG.api, token } });
        container.rebind(PLATFORM.Db).toConstantValue(boundaryGuard("PLATFORM.Db", breach));
        container.rebind(PLATFORM.Redis).toConstantValue(boundaryGuard("PLATFORM.Redis", breach));
        container
            .rebind(PLATFORM.HttpClient)
            .toConstantValue(boundaryGuard("PLATFORM.HttpClient", breach));

        const app = createApp(container, { token: container.get(PLATFORM.Config).api.token });
        const { server, url } = await listen(app.fetch);
        return new this({ container, server, url, token, breaches });
    }

    /** Idempotent; `await using` calls it at scope end. */
    async close(): Promise<void> {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.errorLog?.restore();
        if ("closeAllConnections" in this.server) {
            this.server.closeAllConnections();
        }
        await new Promise<void>((resolve, reject) => {
            this.server.close((error) => (error ? reject(error) : resolve()));
        });
    }

    [Symbol.asyncDispose](): Promise<void> {
        return this.close();
    }

    health(): Promise<Response> {
        return this.send("/health", {});
    }

    get(path: string): Promise<Response> {
        return this.request(path);
    }

    anonymous(path: string, options: RequestOptions = {}): Promise<Response> {
        return this.send(path, options);
    }

    withAuthorization(path: string, authorization: string): Promise<Response> {
        return this.send(path, { headers: { Authorization: authorization } });
    }

    /**
     * Mutes `console.error` until `close()`, for a test that provokes a 5xx: the API logs the cause
     * it hides from the response. The returned calls let the test assert that cause was logged.
     */
    silenceErrorLog(): ErrorLog {
        if (!this.errorLog) {
            const original = console.error;
            const calls: unknown[][] = [];
            console.error = (...args: unknown[]) => {
                calls.push(args);
            };
            this.errorLog = {
                calls,
                restore: () => {
                    console.error = original;
                },
            };
        }
        return this.errorLog;
    }

    protected fake<T>(token: ServiceIdentifier<T>, result: ExecuteResult<T>): FakeUseCase<T> {
        return this.fakeWith(token, () => result);
    }

    protected fakeThrowing<T>(token: ServiceIdentifier<T>, error: Error): FakeUseCase<T> {
        return this.fakeWith(token, () => {
            throw error;
        });
    }

    protected request(path: string, options: RequestOptions = {}): Promise<Response> {
        return this.send(path, {
            ...options,
            headers: { Authorization: `Bearer ${this.token}`, ...options.headers },
        });
    }

    protected json(path: string, method: string, body: unknown): Promise<Response> {
        return this.request(path, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    }

    protected async reply<T>(
        response: Promise<Response>,
        schema: ZodType<T, ZodTypeDef, unknown>,
    ): Promise<ApiReply<T>> {
        const res = await response;
        const json: unknown = res.status === 204 ? undefined : await res.json();
        return {
            status: res.status,
            body: res.ok ? schema.parse(json) : ERROR_ENVELOPE.parse(json),
        };
    }

    private fakeWith<T>(
        token: ServiceIdentifier<T>,
        answer: () => ExecuteResult<T>,
    ): FakeUseCase<T> {
        const fake = new RecordingUseCase<T>(answer);
        this.container.rebind(token).toConstantValue(fake as unknown as T);
        return fake;
    }

    /** The request over the socket; a guarded port reached meanwhile fails it with that breach. */
    private async send(path: string, options: RequestOptions): Promise<Response> {
        const response = await fetch(`${this.url}${path}`, options);
        const [breach] = this.breaches.splice(0);
        if (breach) {
            throw breach;
        }
        return response;
    }
}

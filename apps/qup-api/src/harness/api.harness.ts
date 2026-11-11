// fallow-ignore-file code-duplication -- ADR 0008 keeps one base harness per app; its generic parts mirror investlab-api's until a shared harness package is decided
import { serve, type ServerType } from "@hono/node-server";
import { DATA_TOKENS } from "@m0n0lab/qup-data";
import { TOKENS, type EventBus } from "@m0n0lab/qup-domain";
import { createApp } from "../app.ts";
import { createContainer } from "../container.ts";
import type { ApiErrorDto } from "@m0n0lab/qup-shared";
import type { Container, ServiceIdentifier } from "inversify";
import type { ResultAsync } from "neverthrow";

const ADMIN_PIN = "4321";

/** Never dialled: the guard on `DATA_TOKENS.DrizzleDb` answers first. */
const GUARDED_DATABASE_URL = "postgres://boundary/guarded";

type Execute<T> = T extends { execute: (...args: infer A) => infer R }
    ? { args: A; result: R }
    : never;
type ExecuteArgs<T> = Execute<T>["args"];
type ExecuteResult<T> = Execute<T>["result"];

/** The error side of a use case's `ResultAsync`, what a `given*Fails` arranges. */
export type UseCaseError<T> = ExecuteResult<T> extends ResultAsync<unknown, infer E> ? E : never;

export interface FakeUseCase<T> {
    readonly calls: ExecuteArgs<T>[];
}

/** A route's answer read as the wire contract: its DTO on 2xx (`undefined` on 204), else the error envelope. */
export interface ApiReply<T> {
    readonly status: number;
    readonly body: T | ApiErrorDto;
}

export interface ErrorLog {
    readonly calls: unknown[][];
}

export interface ServerEvent {
    readonly event: string;
    readonly data: unknown;
}

export interface RequestOptions {
    readonly method?: string;
    readonly headers?: Readonly<Record<string, string>>;
    readonly body?: string;
}

class RecordingUseCase<T> implements FakeUseCase<T> {
    readonly calls: ExecuteArgs<T>[] = [];

    constructor(private readonly answer: () => ExecuteResult<T>) {}

    execute(...args: ExecuteArgs<T>): ExecuteResult<T> {
        this.calls.push(args);
        return this.answer();
    }
}

/** The app's own bus, counting live subscriptions so a test can see a stream let go of them. */
class ObservedEventBus implements EventBus {
    active = 0;

    constructor(private readonly bus: EventBus) {}

    emit<T>(event: string, payload: T): void {
        this.bus.emit(event, payload);
    }

    on<T>(event: string, handler: (payload: T) => void): () => void {
        const dispose = this.bus.on(event, handler);
        this.active += 1;
        let disposed = false;
        return () => {
            if (!disposed) {
                disposed = true;
                this.active -= 1;
            }
            dispose();
        };
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

/** Sets `vars` and returns what puts the previous values back. */
function setEnv(vars: Readonly<Record<string, string>>): () => void {
    const previous = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]));
    Object.assign(process.env, vars);
    return () => {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    };
}

type Fetch = Parameters<typeof serve>[0]["fetch"];

function listen(fetch: Fetch): Promise<{ server: ServerType; url: string }> {
    return new Promise((resolve) => {
        const server = serve({ fetch, hostname: "127.0.0.1", port: 0 }, ({ port }) =>
            resolve({ server, url: `http://127.0.0.1:${port}` }),
        );
    });
}

/** A `text/event-stream` body read frame by frame; pings are skipped. */
export class EventStream implements AsyncDisposable {
    private readonly decoder = new TextDecoder();
    private buffer = "";

    constructor(
        private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
        private readonly abort: () => void,
    ) {}

    /** The next event other than a ping, its data parsed as JSON; a signal with no data reads as `""`. */
    async next(): Promise<ServerEvent> {
        for (;;) {
            const frame = await this.frame();
            if (frame.event !== "ping") {
                return {
                    event: frame.event,
                    data: frame.data === "" ? "" : JSON.parse(frame.data),
                };
            }
        }
    }

    /** Resolves on the first ping, written once the route has subscribed. */
    async ready(): Promise<void> {
        const frame = await this.frame();
        if (frame.event !== "ping") {
            throw new Error(`expected the opening ping, got "${frame.event}"`);
        }
    }

    /** Hangs up, as a client closing its tab. */
    close(): void {
        this.abort();
    }

    async [Symbol.asyncDispose](): Promise<void> {
        this.close();
    }

    private async frame(): Promise<{ event: string; data: string }> {
        let end = this.buffer.indexOf("\n\n");
        while (end === -1) {
            const { done, value } = await this.reader.read();
            if (done) {
                throw new Error("event stream ended");
            }
            this.buffer += this.decoder.decode(value, { stream: true });
            end = this.buffer.indexOf("\n\n");
        }
        const lines = this.buffer.slice(0, end).split("\n");
        this.buffer = this.buffer.slice(end + 2);
        const field = (name: string) =>
            lines
                .filter((line) => line.startsWith(`${name}: `))
                .map((line) => line.slice(name.length + 2))
                .join("\n");
        return { event: field("event"), data: field("data") };
    }
}

export interface Started {
    readonly container: Container;
    readonly server: ServerType;
    readonly url: string;
    readonly breaches: Error[];
    readonly bus: ObservedEventBus;
    readonly routes: () => string[];
    readonly release: () => Promise<void>;
}

export interface StartOptions {
    readonly databaseUrl: string;
    /** Puts guards on the platform ports; off only for a harness that brings its own database. */
    readonly guarded: boolean;
    readonly release?: () => Promise<void>;
}

/**
 * The API launched for real from its own composition root on a loopback port. Use cases the test
 * arranges through `fake()` answer in its place; the database behind them is guarded, so an
 * unarranged use case fails the request instead of reaching Postgres.
 * The only test code that knows hono, @hono/node-server or inversify.
 */
export class ApiHarness implements AsyncDisposable {
    readonly url: string;
    private readonly container: Container;
    private readonly server: ServerType;
    private readonly breaches: Error[];
    private readonly bus: ObservedEventBus;
    private readonly listRoutes: () => string[];
    private readonly release: () => Promise<void>;
    private readonly streams: AbortController[] = [];
    private errorLog: (ErrorLog & { readonly restore: () => void }) | undefined;
    private closed = false;

    constructor({ container, server, url, breaches, bus, routes, release }: Started) {
        this.container = container;
        this.server = server;
        this.url = url;
        this.breaches = breaches;
        this.bus = bus;
        this.listRoutes = routes;
        this.release = release;
    }

    static launch<H extends ApiHarness>(this: new (started: Started) => H): Promise<H> {
        return start(this, { databaseUrl: GUARDED_DATABASE_URL, guarded: true });
    }

    /** Idempotent; `await using` calls it at scope end. */
    async close(): Promise<void> {
        if (this.closed) {
            return;
        }
        this.closed = true;
        for (const stream of this.streams) {
            stream.abort();
        }
        if ("closeAllConnections" in this.server) {
            this.server.closeAllConnections();
        }
        await new Promise<void>((resolve, reject) => {
            this.server.close((error) => (error ? reject(error) : resolve()));
        });
        await this.release();
        this.errorLog?.restore();
    }

    [Symbol.asyncDispose](): Promise<void> {
        return this.close();
    }

    routes(): string[] {
        return this.listRoutes();
    }

    get(path: string): Promise<Response> {
        return this.send(path, {});
    }

    anonymous(path: string, options: RequestOptions = {}): Promise<Response> {
        return this.send(path, options);
    }

    withAdminPin(path: string, pin: string, options: RequestOptions = {}): Promise<Response> {
        return this.send(path, { ...options, headers: { "X-Admin-Pin": pin, ...options.headers } });
    }

    /** Subscriptions to the app's event bus still open. */
    subscriptions(): number {
        return this.bus.active;
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

    /** Publishes on the app's event bus, as a use case does after a change. */
    protected emit(event: string, payload: unknown): void {
        this.bus.emit(event, payload);
    }

    protected request(path: string, options: RequestOptions = {}): Promise<Response> {
        return this.send(path, options);
    }

    protected admin(path: string, options: RequestOptions = {}): Promise<Response> {
        return this.withAdminPin(path, ADMIN_PIN, options);
    }

    protected json(path: string, method: string, body: unknown): Promise<Response> {
        return this.request(path, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    }

    protected adminJson(path: string, method: string, body: unknown): Promise<Response> {
        return this.admin(path, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    }

    protected async reply<T>(response: Promise<Response>): Promise<ApiReply<T>> {
        const res = await response;
        const body = (res.status === 204 ? undefined : await res.json()) as T | ApiErrorDto;
        return { status: res.status, body };
    }

    /** Opens an event stream and resolves once the route has subscribed; rejects on any other answer. */
    protected async stream(path: string): Promise<EventStream> {
        const controller = new AbortController();
        this.streams.push(controller);
        const res = await this.send(path, { signal: controller.signal });
        if (res.status !== 200 || !res.body) {
            throw new Error(`event stream answered ${res.status}`);
        }
        const events = new EventStream(res.body.getReader(), () => controller.abort());
        await events.ready();
        return events;
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
    private async send(
        path: string,
        options: RequestOptions & { readonly signal?: AbortSignal },
    ): Promise<Response> {
        const response = await fetch(`${this.url}${path}`, options);
        const [breach] = this.breaches.splice(0);
        if (breach) {
            throw breach;
        }
        return response;
    }
}

/** Builds the app from `createContainer()` with the env it reads, then serves it on a loopback port. */
export async function start<H extends ApiHarness>(
    Harness: new (started: Started) => H,
    options: StartOptions,
): Promise<H> {
    const restoreEnv = setEnv({ DATABASE_URL: options.databaseUrl, API_ADMIN_PIN: ADMIN_PIN });
    const breaches: Error[] = [];

    const container = createContainer();
    const pool = container.get<{ $client: { end: () => Promise<void> } }>(
        DATA_TOKENS.DrizzleDb,
    ).$client;
    if (options.guarded) {
        container
            .rebind(DATA_TOKENS.DrizzleDb)
            .toConstantValue(boundaryGuard("DATA_TOKENS.DrizzleDb", (e) => breaches.push(e)));
    }
    const bus = new ObservedEventBus(container.get<EventBus>(TOKENS.EventBus));
    container.rebind(TOKENS.EventBus).toConstantValue(bus);

    const app = createApp(container);
    const { server, url } = await listen(app.fetch);
    const routes = () => app.routes.map((r) => `${r.method} ${r.path}`);
    const release = async () => {
        await pool.end();
        await options.release?.();
        restoreEnv();
    };
    return new Harness({ container, server, url, breaches, bus, routes, release });
}

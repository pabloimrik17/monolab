import { injectable } from "inversify";
import { Result, ResultAsync } from "neverthrow";
import { NetworkError } from "@m0n0lab/investlab-core";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequest {
    readonly method: HttpMethod;
    readonly url: string;
    readonly headers?: Readonly<Record<string, string>>;
    /** Serialized as JSON when present. */
    readonly body?: unknown;
    /** Overrides the default timeout for this request. */
    readonly timeoutMs?: number;
}

export interface HttpResponse {
    readonly status: number;
    /** Parsed JSON body; `undefined` when the response has none. */
    readonly body: unknown;
}

const DEFAULT_TIMEOUT_MS = 10_000;

const parseJson = Result.fromThrowable(
    (text: string): unknown => (text === "" ? undefined : JSON.parse(text)),
    (cause) => new NetworkError(cause),
);

/**
 * Generic JSON over `fetch`. Every HTTP status comes back as a response with its parsed body;
 * only transport failures (unreachable, timeout, unparsable body) are `NetworkError`s.
 * Knows no base URL, endpoint or credentials.
 */
@injectable()
export class HttpClient {
    request({
        method,
        url,
        headers = {},
        body,
        timeoutMs = DEFAULT_TIMEOUT_MS,
    }: HttpRequest): ResultAsync<HttpResponse, NetworkError> {
        return ResultAsync.fromPromise(
            fetch(url, {
                method,
                headers: {
                    Accept: "application/json",
                    ...(body !== undefined && { "Content-Type": "application/json" }),
                    ...headers,
                },
                ...(body !== undefined && { body: JSON.stringify(body) }),
                signal: AbortSignal.timeout(timeoutMs),
            }),
            (cause) => new NetworkError(cause),
        ).andThen((response) =>
            ResultAsync.fromPromise(response.text(), (cause) => new NetworkError(cause))
                .andThen(parseJson)
                .map((parsed) => ({ status: response.status, body: parsed })),
        );
    }
}

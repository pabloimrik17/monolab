import { errorJson, type ApiDomainError } from "../errors/error-mapping.ts";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Result } from "neverthrow";

/** A use case's value serialized with `toDto` under `status`, or its error as the wire envelope. */
export function replyJson<T, D>(
    c: Context,
    result: Result<T, ApiDomainError>,
    toDto: (value: T) => D,
    status: ContentfulStatusCode = 200,
): Response {
    return result.match(
        (value) => c.json(toDto(value), status),
        (error) => errorJson(c, error),
    );
}

/** 204 without a body when the use case succeeds, else its error as the wire envelope. */
export function replyEmpty(c: Context, result: Result<void, ApiDomainError>): Response {
    return result.match(
        () => c.body(null, 204),
        (error) => errorJson(c, error),
    );
}

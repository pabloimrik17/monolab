import { describe, expectTypeOf, test } from "vitest";
import type {
    HttpCredentialsMode,
    HttpHeaders,
    HttpMethod,
    HttpResponseType,
    HttpStatusCode,
} from "../index.js";

/**
 * Type-level tests for core HTTP types.
 * @vitest-environment node
 */

describe("HttpMethod type safety", () => {
    test("HttpMethod accepts standard HTTP verbs", () => {
        const get: HttpMethod = "GET";
        const post: HttpMethod = "POST";
        const put: HttpMethod = "PUT";
        const patch: HttpMethod = "PATCH";
        const deleteMethod: HttpMethod = "DELETE";
        const head: HttpMethod = "HEAD";
        const options: HttpMethod = "OPTIONS";

        expectTypeOf(get).toMatchTypeOf<HttpMethod>();
        expectTypeOf(post).toMatchTypeOf<HttpMethod>();
        expectTypeOf(put).toMatchTypeOf<HttpMethod>();
        expectTypeOf(patch).toMatchTypeOf<HttpMethod>();
        expectTypeOf(deleteMethod).toMatchTypeOf<HttpMethod>();
        expectTypeOf(head).toMatchTypeOf<HttpMethod>();
        expectTypeOf(options).toMatchTypeOf<HttpMethod>();
    });
});

describe("HttpHeaders type safety", () => {
    test("HttpHeaders accepts string values", () => {
        const headers: HttpHeaders = {
            "Content-Type": "application/json",
            Authorization: "Bearer token",
        };

        expectTypeOf(headers).toMatchTypeOf<HttpHeaders>();
    });

    test("HttpHeaders accepts array of strings", () => {
        const headers: HttpHeaders = {
            Accept: ["application/json", "text/html"],
            "X-Custom": ["value1", "value2"],
        };

        expectTypeOf(headers).toMatchTypeOf<HttpHeaders>();
    });

    test("HttpHeaders accepts mixed string and array values", () => {
        const headers: HttpHeaders = {
            "Content-Type": "application/json",
            Accept: ["application/json", "text/html"],
        };

        expectTypeOf(headers).toMatchTypeOf<HttpHeaders>();
    });
});

describe("HttpStatusCode type safety", () => {
    test("HttpStatusCode accepts informational codes", () => {
        const code100: HttpStatusCode = 100;
        const code101: HttpStatusCode = 101;

        expectTypeOf(code100).toMatchTypeOf<HttpStatusCode>();
        expectTypeOf(code101).toMatchTypeOf<HttpStatusCode>();
    });

    test("HttpStatusCode accepts success codes", () => {
        const code200: HttpStatusCode = 200;
        const code201: HttpStatusCode = 201;
        const code204: HttpStatusCode = 204;

        expectTypeOf(code200).toMatchTypeOf<HttpStatusCode>();
        expectTypeOf(code201).toMatchTypeOf<HttpStatusCode>();
        expectTypeOf(code204).toMatchTypeOf<HttpStatusCode>();
    });

    test("HttpStatusCode accepts redirection codes", () => {
        const code301: HttpStatusCode = 301;
        const code302: HttpStatusCode = 302;
        const code304: HttpStatusCode = 304;

        expectTypeOf(code301).toMatchTypeOf<HttpStatusCode>();
        expectTypeOf(code302).toMatchTypeOf<HttpStatusCode>();
        expectTypeOf(code304).toMatchTypeOf<HttpStatusCode>();
    });

    test("HttpStatusCode accepts client error codes", () => {
        const code400: HttpStatusCode = 400;
        const code401: HttpStatusCode = 401;
        const code404: HttpStatusCode = 404;

        expectTypeOf(code400).toMatchTypeOf<HttpStatusCode>();
        expectTypeOf(code401).toMatchTypeOf<HttpStatusCode>();
        expectTypeOf(code404).toMatchTypeOf<HttpStatusCode>();
    });

    test("HttpStatusCode accepts server error codes", () => {
        const code500: HttpStatusCode = 500;
        const code502: HttpStatusCode = 502;
        const code503: HttpStatusCode = 503;

        expectTypeOf(code500).toMatchTypeOf<HttpStatusCode>();
        expectTypeOf(code502).toMatchTypeOf<HttpStatusCode>();
        expectTypeOf(code503).toMatchTypeOf<HttpStatusCode>();
    });
});

describe("HttpResponseType type safety", () => {
    test("HttpResponseType accepts all valid values", () => {
        const json: HttpResponseType = "json";
        const text: HttpResponseType = "text";
        const blob: HttpResponseType = "blob";
        const arraybuffer: HttpResponseType = "arraybuffer";
        const stream: HttpResponseType = "stream";

        expectTypeOf(json).toMatchTypeOf<HttpResponseType>();
        expectTypeOf(text).toMatchTypeOf<HttpResponseType>();
        expectTypeOf(blob).toMatchTypeOf<HttpResponseType>();
        expectTypeOf(arraybuffer).toMatchTypeOf<HttpResponseType>();
        expectTypeOf(stream).toMatchTypeOf<HttpResponseType>();
    });
});

describe("HttpCredentialsMode type safety", () => {
    test("HttpCredentialsMode accepts all valid values", () => {
        const omit: HttpCredentialsMode = "omit";
        const sameOrigin: HttpCredentialsMode = "same-origin";
        const include: HttpCredentialsMode = "include";

        expectTypeOf(omit).toMatchTypeOf<HttpCredentialsMode>();
        expectTypeOf(sameOrigin).toMatchTypeOf<HttpCredentialsMode>();
        expectTypeOf(include).toMatchTypeOf<HttpCredentialsMode>();
    });
});

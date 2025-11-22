import { describe, expectTypeOf, test } from "vitest";
import type {
    HttpRequestConfig,
    HttpResponse,
    HttpStatusCode,
} from "../index.js";

/**
 * Type-level tests for HttpResponse interface.
 * @vitest-environment node
 */

describe("HttpResponse type safety", () => {
    test("response data is typed", () => {
        interface User {
            id: number;
            name: string;
        }

        const response: HttpResponse<User> = {} as HttpResponse<User>;

        expectTypeOf(response.data).toEqualTypeOf<User>();
        expectTypeOf(response.status).toEqualTypeOf<HttpStatusCode>();
        expectTypeOf(response.statusText).toEqualTypeOf<string>();
        expectTypeOf(response.url).toEqualTypeOf<string>();
    });

    test("response request is readonly", () => {
        const response: HttpResponse<unknown> = {} as HttpResponse<unknown>;

        expectTypeOf(response.request).toMatchTypeOf<
            Readonly<HttpRequestConfig>
        >();
    });
});

describe("HttpResponse readonly enforcement", () => {
    test("HttpResponse properties are readonly", () => {
        interface User {
            id: number;
        }

        const response: HttpResponse<User> = {} as HttpResponse<User>;

        expectTypeOf(response).toHaveProperty("data").toEqualTypeOf<User>();
        expectTypeOf(response)
            .toHaveProperty("status")
            .toEqualTypeOf<HttpStatusCode>();
    });
});

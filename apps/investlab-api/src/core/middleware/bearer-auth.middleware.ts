import { timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";

const BEARER_PREFIX = "Bearer ";

function safeEqual(received: string, expected: string): boolean {
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

export function bearerAuth(expectedToken: string | undefined) {
    return async (c: Context, next: Next): Promise<Response | void> => {
        const header = c.req.header("Authorization");
        const received = header?.startsWith(BEARER_PREFIX)
            ? header.slice(BEARER_PREFIX.length)
            : "";

        if (!expectedToken || !received || !safeEqual(received, expectedToken)) {
            return c.json(
                {
                    code: "UNAUTHORIZED",
                    message: "Invalid or missing bearer token",
                    statusCode: 401,
                },
                401,
            );
        }

        await next();
    };
}

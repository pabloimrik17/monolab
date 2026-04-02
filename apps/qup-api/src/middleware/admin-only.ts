import type { Context, Next } from "hono";

export function adminOnly() {
    return async (c: Context, next: Next): Promise<Response | void> => {
        const pin = c.req.header("X-Admin-Pin");
        const expected = process.env["API_ADMIN_PIN"];

        if (!pin || pin !== expected) {
            return c.json(
                { code: "UNAUTHORIZED", message: "Invalid admin PIN", statusCode: 401 },
                401,
            );
        }

        await next();
    };
}

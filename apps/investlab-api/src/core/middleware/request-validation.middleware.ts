import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { RequestValidationError } from "#core/error/request-validation.error.ts";
import type { ZodType, ZodTypeDef } from "zod";

type Schema<T> = ZodType<T, ZodTypeDef, unknown>;

function parseWith<T>(schema: Schema<T>, input: unknown, root = ""): T {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
        throw RequestValidationError.fromZod(parsed.error, root);
    }

    return parsed.data;
}

/** The JSON body parsed with `schema`, read in the handler as `c.get("body")`. */
export function validateJsonBody<T>(schema: Schema<T>) {
    return createMiddleware<{ Variables: { body: T } }>(async (c, next) => {
        let body: unknown;
        try {
            body = await c.req.json();
        } catch {
            throw new RequestValidationError([{ path: "", message: "Body must be valid JSON" }]);
        }

        c.set("body", parseWith(schema, body));
        await next();
    });
}

/** The query string parsed with `schema`, read in the handler as `c.get("query")`. */
export function validateQuery<T>(schema: Schema<T>) {
    return createMiddleware<{ Variables: { query: T } }>(async (c, next) => {
        c.set("query", parseWith(schema, c.req.query()));
        await next();
    });
}

const idSchema = z.string().uuid();

/** The `:id` route parameter, which must be a UUID, read in the handler as `c.get("id")`. */
export const validateId = createMiddleware<{ Variables: { id: string } }>(async (c, next) => {
    c.set("id", parseWith(idSchema, c.req.param("id"), "id"));
    await next();
});

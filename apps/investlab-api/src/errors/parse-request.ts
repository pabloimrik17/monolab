import { z } from "zod";
import { RequestValidationError } from "./request-validation.error.ts";
import type { Context } from "hono";
import type { ZodType, ZodTypeDef } from "zod";

export function parseWith<T>(
    schema: ZodType<T, ZodTypeDef, unknown>,
    input: unknown,
    root = "",
): T {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
        throw RequestValidationError.fromZod(parsed.error, root);
    }
    return parsed.data;
}

export async function parseJsonBody<T>(
    c: Context,
    schema: ZodType<T, ZodTypeDef, unknown>,
): Promise<T> {
    let body: unknown;
    try {
        body = await c.req.json();
    } catch {
        throw new RequestValidationError([{ path: "", message: "Body must be valid JSON" }]);
    }
    return parseWith(schema, body);
}

const idSchema = z.string().uuid();

/** The `:id` route parameter, which must be a UUID. */
export function parseId(c: { req: { param(name: "id"): string } }): string {
    return parseWith(idSchema, c.req.param("id"), "id");
}

import { zValidator, type Hook } from "@hono/zod-validator";
import { ResultAsync } from "neverthrow";
import { z } from "zod";
import { RequestValidationError } from "#core/error/request-validation.error.ts";
import { errorJson } from "#core/mapper/error-http.mapper.ts";
import type { Context, Env } from "hono";
import type { ZodTypeAny } from "zod";

const JSON_CONTENT_TYPE = /^application\/(?:[\w.-]+\+)?json\s*(?:;|$)/i;

const rejectInvalid: Hook<unknown, Env, string> = (result, c: Context) =>
    result.success ? undefined : errorJson(c, RequestValidationError.fromZod(result.error));

const rejectBody = (c: Context, message: string): Response =>
    errorJson(c, new RequestValidationError([{ path: "", message }]));

/**
 * The JSON body parsed with `schema`, read in the handler as `c.req.valid("json")`.
 *
 * Hono's validator skips parsing when the Content-Type is not JSON and validates `{}`, which
 * would let a mislabelled body through as an empty update; the body is rejected here instead.
 */
export const validateJsonBody = <T extends ZodTypeAny>(schema: T) => {
    const validator = zValidator("json", schema, rejectInvalid);

    const guarded: typeof validator = async (c, next) => {
        if (!JSON_CONTENT_TYPE.test(c.req.header("Content-Type") ?? "")) {
            return rejectBody(c, "Body must be JSON (Content-Type: application/json)");
        }

        // Hono caches the parsed body, so the validator below does not read it twice.
        const parsed = await ResultAsync.fromPromise(c.req.json(), () => null);
        if (parsed.isErr()) {
            return rejectBody(c, "Body must be valid JSON");
        }

        return validator(c, next);
    };

    return guarded;
};

/** The query string parsed with `schema`, read in the handler as `c.req.valid("query")`. */
export const validateQuery = <T extends ZodTypeAny>(schema: T) =>
    zValidator("query", schema, rejectInvalid);

/** The `:id` route parameter, which must be a UUID, read in the handler as `c.req.valid("param")`. */
export const validateId = zValidator("param", z.object({ id: z.string().uuid() }), rejectInvalid);

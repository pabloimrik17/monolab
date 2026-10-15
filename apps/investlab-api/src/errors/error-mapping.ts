import { DomainError, type DomainErrorCode } from "@m0n0lab/investlab-domain";
import { RequestValidationError } from "./request-validation.error.ts";
import type { ApiErrorDto } from "@m0n0lab/investlab-data-contracts";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const STATUS_BY_CODE = {
    PORTFOLIO_ITEM_NOT_FOUND: 404,
    INSTRUMENT_NOT_FOUND: 404,
    PORTFOLIO_ITEM_CONFLICT: 409,
    VALIDATION_ERROR: 422,
    PERSISTENCE_ERROR: 500,
} as const satisfies Record<DomainErrorCode, number>;

export function errorToHttp(error: DomainError): number {
    return STATUS_BY_CODE[error.code];
}

export function toApiError(error: DomainError): ApiErrorDto {
    const statusCode = errorToHttp(error);
    return {
        code: error.code,
        message: statusCode >= 500 ? "Internal server error" : error.message,
        statusCode,
        ...(error instanceof RequestValidationError && { issues: [...error.issues] }),
    };
}

export function errorJson(c: Context, error: DomainError): Response {
    const dto = toApiError(error);
    if (dto.statusCode >= 500) {
        // The response hides the cause, so the log is the only place it survives.
        console.error(`${error.code}:`, error);
    }
    return c.json(dto, dto.statusCode as ContentfulStatusCode);
}

export function handleError(error: Error, c: Context): Response {
    if (error instanceof DomainError) {
        return errorJson(c, error);
    }

    console.error("Unhandled error:", error);
    return c.json(
        {
            code: "INTERNAL_ERROR",
            message: "Internal server error",
            statusCode: 500,
        } satisfies ApiErrorDto,
        500,
    );
}

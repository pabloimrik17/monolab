import { DomainError, type ApiErrorDto, type KernelErrorCode } from "@m0n0lab/investlab-core";
import { RequestValidationError } from "./request-validation.error.ts";
import type { PortfolioErrorCode } from "@m0n0lab/investlab-portfolio";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Every code a use case can fail with: the kernel's plus each module's. Quotes declare none. */
type ApiDomainErrorCode = KernelErrorCode | PortfolioErrorCode;

export type ApiDomainError = DomainError<ApiDomainErrorCode>;

// `satisfies Record<…>` makes an unmapped code a type error.
const STATUS_BY_CODE = {
    PORTFOLIO_ITEM_NOT_FOUND: 404,
    INSTRUMENT_NOT_FOUND: 404,
    PORTFOLIO_ITEM_CONFLICT: 409,
    INSTRUMENT_IN_USE: 409,
    INSTRUMENT_ALREADY_EXISTS: 409,
    VALIDATION_ERROR: 422,
    PERSISTENCE_ERROR: 500,
} as const satisfies Record<ApiDomainErrorCode, number>;

export function errorToHttp(error: ApiDomainError): number {
    return STATUS_BY_CODE[error.code];
}

export function toApiError(error: ApiDomainError): ApiErrorDto {
    const statusCode = errorToHttp(error);
    return {
        code: error.code,
        message: statusCode >= 500 ? "Internal server error" : error.message,
        statusCode,
        ...(error instanceof RequestValidationError && { issues: [...error.issues] }),
    };
}

export function errorJson(c: Context, error: ApiDomainError): Response {
    const dto = toApiError(error);
    if (dto.statusCode >= 500) {
        // The response hides the cause, so the log is the only place it survives.
        console.error(`${error.code}:`, error);
    }
    return c.json(dto, dto.statusCode as ContentfulStatusCode);
}

function isApiDomainError(error: Error): error is ApiDomainError {
    return error instanceof DomainError && Object.hasOwn(STATUS_BY_CODE, error.code);
}

export function handleError(error: Error, c: Context): Response {
    if (isApiDomainError(error)) {
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

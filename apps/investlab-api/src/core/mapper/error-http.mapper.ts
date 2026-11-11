import { RequestValidationError } from "#core/error/request-validation.error.ts";
import {
    DomainError,
    type ApiErrorDto,
    type ApiErrorIssueDto,
    type KernelErrorCode,
} from "@m0n0lab/investlab-core";
import { FieldNotInStateError, MissingRequiredFieldError } from "@m0n0lab/investlab-roger";
import type { CatalogErrorCode } from "@m0n0lab/investlab-catalog";
import type { PortfolioErrorCode } from "@m0n0lab/investlab-portfolio";
import type { QuotesErrorCode } from "@m0n0lab/investlab-quotes";
import type { RogerErrorCode } from "@m0n0lab/investlab-roger";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

type ApiDomainErrorCode =
    | KernelErrorCode
    | CatalogErrorCode
    | PortfolioErrorCode
    | QuotesErrorCode
    | RogerErrorCode;

export type ApiDomainError = DomainError<ApiDomainErrorCode>;

// `satisfies Record<…>` makes an unmapped code a type error.
const STATUS_BY_CODE = {
    PORTFOLIO_ITEM_NOT_FOUND: 404,
    INSTRUMENT_NOT_FOUND: 404,
    PORTFOLIO_ITEM_CONFLICT: 409,
    INSTRUMENT_IN_USE: 409,
    INSTRUMENT_ALREADY_EXISTS: 409,
    ENTRY_NOT_FOUND: 404,
    ENTRY_CONFLICT: 409,
    INVALID_TRANSITION: 409,
    MISSING_REQUIRED_FIELD: 422,
    FIELD_NOT_IN_STATE: 422,
    VALIDATION_ERROR: 422,
    PERSISTENCE_ERROR: 500,
    MARKET_DATA_UNAVAILABLE: 503,
} as const satisfies Record<ApiDomainErrorCode, number>;

function errorToHttp(error: ApiDomainError): number {
    return STATUS_BY_CODE[error.code];
}

function fieldIssues(error: ApiDomainError): ApiErrorIssueDto[] | undefined {
    if (error instanceof RequestValidationError) {
        return [...error.issues];
    }
    if (error instanceof MissingRequiredFieldError || error instanceof FieldNotInStateError) {
        return [{ path: error.field, message: error.message }];
    }
    return undefined;
}

function toApiError(error: ApiDomainError): ApiErrorDto {
    const statusCode = errorToHttp(error);
    const issues = fieldIssues(error);
    return {
        code: error.code,
        message: statusCode >= 500 ? "Internal server error" : error.message,
        statusCode,
        ...(issues && { issues }),
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

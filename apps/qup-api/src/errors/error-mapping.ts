import {
    DomainError,
    EmptyOrderError,
    InvalidCodeError,
    InvalidTransitionError,
    MenuItemNotAvailableError,
    MenuItemNotFoundError,
    OrderNotCancellableError,
    OrderNotFoundError,
    PersistenceError,
    SessionAlreadyClosedError,
    SessionClosedError,
    SessionNotFoundError,
    ValidationError,
} from "@m0n0lab/qup-domain";
import type { ApiErrorDto } from "@m0n0lab/qup-shared";

const STATUS_MAP: ReadonlyMap<string, number> = new Map([
    [SessionNotFoundError.name, 404],
    [OrderNotFoundError.name, 404],
    [MenuItemNotFoundError.name, 404],
    [SessionClosedError.name, 409],
    [SessionAlreadyClosedError.name, 409],
    [OrderNotCancellableError.name, 409],
    [InvalidTransitionError.name, 409],
    [EmptyOrderError.name, 422],
    [MenuItemNotAvailableError.name, 422],
    [ValidationError.name, 422],
    [InvalidCodeError.name, 422],
    [PersistenceError.name, 500],
]);

export function errorToHttp(error: DomainError): number {
    return STATUS_MAP.get(error.name) ?? 500;
}

export function toApiError(error: DomainError): ApiErrorDto {
    const statusCode = errorToHttp(error);
    return {
        code: error.code,
        message: statusCode >= 500 ? "Internal server error" : error.message,
        statusCode,
    };
}

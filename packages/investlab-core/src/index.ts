export { DomainError } from "./domain/error/domain.error.ts";
export type { KernelError, KernelErrorCode } from "./domain/error/kernel.error.ts";
export { NetworkError } from "./domain/error/network.error.ts";
export { PersistenceError } from "./domain/error/persistence.error.ts";
export type { RemotePortError } from "./domain/error/remote-port.error.ts";
export { UnauthorizedError } from "./domain/error/unauthorized.error.ts";
export { ValidationError } from "./domain/error/validation.error.ts";
export {
    apiErrorCodeSchema,
    apiErrorDtoSchema,
    apiErrorIssueDtoSchema,
    type ApiErrorCode,
    type ApiErrorDto,
    type ApiErrorIssueDto,
} from "./data/shared/dto/api-error.dto.ts";

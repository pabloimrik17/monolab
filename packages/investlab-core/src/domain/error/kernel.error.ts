import type { NetworkError } from "./network.error.ts";
import type { PersistenceError } from "./persistence.error.ts";
import type { UnauthorizedError } from "./unauthorized.error.ts";
import type { ValidationError } from "./validation.error.ts";

export type KernelErrorCode = "PERSISTENCE_ERROR" | "VALIDATION_ERROR";

/** What every remote port can fail with, whatever the module. */
export type KernelError = ValidationError | PersistenceError | NetworkError | UnauthorizedError;

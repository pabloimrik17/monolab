import type { NetworkError } from "./network.error.ts";
import type { PersistenceError } from "./persistence.error.ts";
import type { UnauthorizedError } from "./unauthorized.error.ts";
import type { ValidationError } from "./validation.error.ts";

export type KernelErrorCode = "PERSISTENCE_ERROR" | "VALIDATION_ERROR";

/** Failures every remote (HTTP) port can return whatever the module: kernel codes rebuilt as errors plus transport and authorization failures. */
export type KernelError = ValidationError | PersistenceError | NetworkError | UnauthorizedError;

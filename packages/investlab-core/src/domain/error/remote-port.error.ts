import type { DomainError } from "./domain.error.ts";
import type { KernelError } from "./kernel.error.ts";

/** `E`: the module errors the port rebuilds from server codes. */
export type RemotePortError<E extends DomainError = never> = KernelError | E;

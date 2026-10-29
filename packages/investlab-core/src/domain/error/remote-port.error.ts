import type { DomainError } from "./domain.error.ts";
import type { KernelError } from "./kernel.error.ts";

/** A remote port's failures: the kernel errors plus the module errors `E` it rebuilds from server codes. */
export type RemotePortError<E extends DomainError = never> = KernelError | E;

// Module errors extend DomainError in their own domain layer.
export abstract class DomainError<Code extends string = string> extends Error {
    abstract readonly code: Code;
}

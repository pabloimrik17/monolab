export abstract class DomainError extends Error {
    abstract readonly code: string;
}

export class SessionNotFoundError extends DomainError {
    readonly code = "SESSION_NOT_FOUND";
    constructor(id: string) {
        super(`Session not found: ${id}`);
        this.name = "SessionNotFoundError";
    }
}

export class SessionClosedError extends DomainError {
    readonly code = "SESSION_CLOSED";
    constructor(id: string) {
        super(`Session is closed: ${id}`);
        this.name = "SessionClosedError";
    }
}

export class SessionAlreadyClosedError extends DomainError {
    readonly code = "SESSION_ALREADY_CLOSED";
    constructor(id: string) {
        super(`Session is already closed: ${id}`);
        this.name = "SessionAlreadyClosedError";
    }
}

export class OrderNotFoundError extends DomainError {
    readonly code = "ORDER_NOT_FOUND";
    constructor(id: string) {
        super(`Order not found: ${id}`);
        this.name = "OrderNotFoundError";
    }
}

export class OrderNotCancellableError extends DomainError {
    readonly code = "ORDER_NOT_CANCELLABLE";
    constructor(orderId: string, status: string) {
        super(`Order ${orderId} cannot be cancelled in status ${status}`);
        this.name = "OrderNotCancellableError";
    }
}

export class InvalidTransitionError extends DomainError {
    readonly code = "INVALID_TRANSITION";
    constructor(from: string, to: string) {
        super(`Invalid transition from ${from} to ${to}`);
        this.name = "InvalidTransitionError";
    }
}

export class EmptyOrderError extends DomainError {
    readonly code = "EMPTY_ORDER";
    constructor() {
        super("Order must have at least one item");
        this.name = "EmptyOrderError";
    }
}

export class MenuItemNotFoundError extends DomainError {
    readonly code = "MENU_ITEM_NOT_FOUND";
    constructor(id: string) {
        super(`Menu item not found: ${id}`);
        this.name = "MenuItemNotFoundError";
    }
}

export class MenuItemNotAvailableError extends DomainError {
    readonly code = "MENU_ITEM_NOT_AVAILABLE";
    constructor(menuItemId: string) {
        super(`Menu item is not available: ${menuItemId}`);
        this.name = "MenuItemNotAvailableError";
    }
}

export class ValidationError extends DomainError {
    readonly code = "VALIDATION_ERROR";
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

export class InvalidCodeError extends DomainError {
    readonly code = "INVALID_CODE";
    constructor(code: string) {
        super(`Invalid session code: ${code}`);
        this.name = "InvalidCodeError";
    }
}

export class PersistenceError extends DomainError {
    readonly code = "PERSISTENCE_ERROR";
    constructor(cause: unknown) {
        super("Database operation failed");
        this.name = "PersistenceError";
        this.cause = cause;
    }
}

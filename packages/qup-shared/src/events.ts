// Every payload here travels on the public session stream, which needs no host PIN, so each
// one carries only what a stream consumer needs to know something changed — never an order.
export interface OrderCreatedEvent {
    sessionId: string;
}

export interface OrderStatusEvent {
    orderId: string;
    sessionId: string;
    status: "PENDING" | "PREPARING" | "DONE" | "CANCELLED";
    updatedAt: string;
}

export interface OrderCancelledEvent {
    orderId: string;
    sessionId: string;
}

export interface SessionClosedEvent {
    sessionId: string;
}

import type { OrderDto } from "./dtos.ts";

export interface OrderCreatedEvent {
    order: OrderDto;
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

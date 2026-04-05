import type { Order } from "../entities/order.ts";
import type { PersistenceError } from "../errors.ts";
import type { ResultAsync } from "neverthrow";

export interface OrderRepository {
    save(order: Order): ResultAsync<Order, PersistenceError>;
    findById(id: string): ResultAsync<Order | null, PersistenceError>;
    findBySessionId(sessionId: string): ResultAsync<Order[], PersistenceError>;
    updateStatus(order: Order): ResultAsync<void, PersistenceError>;
}

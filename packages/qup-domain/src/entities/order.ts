import { err, ok, type Result } from "neverthrow";

import {
    EmptyOrderError,
    InvalidTransitionError,
    OrderNotCancellableError,
    ValidationError,
} from "../errors.ts";
import { OrderItem } from "../value-objects/order-item.ts";
import { OrderStatus } from "../value-objects/order-status.ts";

export interface OrderProps {
    id: string;
    sessionId: string;
    guestName: string;
    items: OrderItem[];
    status: OrderStatus;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export class Order {
    readonly id: string;
    readonly sessionId: string;
    readonly guestName: string;
    readonly items: readonly OrderItem[];
    private _status: OrderStatus;
    readonly notes?: string;
    readonly createdAt: Date;
    private _updatedAt: Date;

    private constructor(props: OrderProps) {
        this.id = props.id;
        this.sessionId = props.sessionId;
        this.guestName = props.guestName;
        this.items = Object.freeze([...props.items]);
        this._status = props.status;
        this.notes = props.notes;
        this.createdAt = props.createdAt;
        this._updatedAt = props.updatedAt;
    }

    get status(): OrderStatus {
        return this._status;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }

    static create(props: {
        sessionId: string;
        guestName: string;
        items: OrderItem[];
        notes?: string;
    }): Result<Order, EmptyOrderError | ValidationError> {
        if (!props.guestName.trim()) {
            return err(new ValidationError("Guest name cannot be empty"));
        }

        if (props.items.length === 0) {
            return err(new EmptyOrderError());
        }

        const now = new Date();
        const order = new Order({
            id: crypto.randomUUID(),
            sessionId: props.sessionId,
            guestName: props.guestName.trim(),
            items: props.items,
            status: OrderStatus.PENDING,
            notes: props.notes,
            createdAt: now,
            updatedAt: now,
        });

        return ok(order);
    }

    static reconstitute(props: OrderProps): Order {
        return new Order(props);
    }

    markPreparing(): Result<void, InvalidTransitionError> {
        const result = this._status.transitionTo(OrderStatus.PREPARING);
        if (result.isErr()) {
            return err(result.error);
        }
        this._status = result.value;
        this._updatedAt = new Date();
        return ok(undefined);
    }

    markDone(): Result<void, InvalidTransitionError> {
        const result = this._status.transitionTo(OrderStatus.DONE);
        if (result.isErr()) {
            return err(result.error);
        }
        this._status = result.value;
        this._updatedAt = new Date();
        return ok(undefined);
    }

    cancel(): Result<void, OrderNotCancellableError> {
        if (!this._status.canTransitionTo(OrderStatus.CANCELLED)) {
            return err(new OrderNotCancellableError(this.id, this._status.value));
        }
        this._status = OrderStatus.CANCELLED;
        this._updatedAt = new Date();
        return ok(undefined);
    }
}

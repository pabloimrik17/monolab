import { err, ok, type Result } from "neverthrow";
import { InvalidTransitionError } from "../errors.ts";

const VALID_TRANSITIONS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
    ["PENDING", new Set(["PREPARING", "CANCELLED"])],
    ["PREPARING", new Set(["DONE"])],
]);

export class OrderStatus {
    static readonly PENDING = new OrderStatus("PENDING");
    static readonly PREPARING = new OrderStatus("PREPARING");
    static readonly DONE = new OrderStatus("DONE");
    static readonly CANCELLED = new OrderStatus("CANCELLED");

    private constructor(private readonly _value: string) {}

    get value(): string {
        return this._value;
    }

    canTransitionTo(target: OrderStatus): boolean {
        const allowed = VALID_TRANSITIONS.get(this._value);
        return allowed?.has(target._value) ?? false;
    }

    transitionTo(target: OrderStatus): Result<OrderStatus, InvalidTransitionError> {
        if (!this.canTransitionTo(target)) {
            return err(new InvalidTransitionError(this._value, target._value));
        }
        return ok(target);
    }

    static from(value: string): OrderStatus {
        switch (value) {
            case "PENDING":
                return OrderStatus.PENDING;
            case "PREPARING":
                return OrderStatus.PREPARING;
            case "DONE":
                return OrderStatus.DONE;
            case "CANCELLED":
                return OrderStatus.CANCELLED;
            default:
                throw new Error(`Unknown order status: ${value}`);
        }
    }

    equals(other: OrderStatus): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return this._value;
    }
}

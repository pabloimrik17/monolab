import { err, ok, type Result } from "neverthrow";
import { ValidationError } from "../errors.ts";

export class OrderItem {
    readonly menuItemId: string;
    readonly menuItemName: string;
    readonly quantity: number;
    readonly customization?: string | undefined;

    private constructor(props: {
        menuItemId: string;
        menuItemName: string;
        quantity: number;
        customization?: string | undefined;
    }) {
        this.menuItemId = props.menuItemId;
        this.menuItemName = props.menuItemName;
        this.quantity = props.quantity;
        if (props.customization != null) {
            this.customization = props.customization;
        }
    }

    static reconstitute(props: {
        menuItemId: string;
        menuItemName: string;
        quantity: number;
        customization?: string;
    }): OrderItem {
        return new OrderItem(props);
    }

    static create(props: {
        menuItemId: string;
        menuItemName: string;
        quantity: number;
        customization?: string;
    }): Result<OrderItem, ValidationError> {
        if (props.quantity <= 0) {
            return err(new ValidationError("Quantity must be greater than 0"));
        }
        return ok(new OrderItem(props));
    }

    equals(other: OrderItem): boolean {
        return (
            this.menuItemId === other.menuItemId &&
            this.menuItemName === other.menuItemName &&
            this.quantity === other.quantity &&
            this.customization === other.customization
        );
    }
}

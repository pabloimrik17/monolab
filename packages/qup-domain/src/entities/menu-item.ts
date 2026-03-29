import { err, ok, type Result } from "neverthrow";
import { ValidationError } from "../errors.ts";
import { Category } from "../value-objects/category.ts";

export interface MenuItemProps {
    id: string;
    name: string;
    category: Category;
    description?: string | undefined;
    available: boolean;
    sortOrder: number;
}

export class MenuItem {
    readonly id: string;
    private _name: string;
    private _category: Category;
    private _description?: string | undefined;
    private _available: boolean;
    private _sortOrder: number;

    private constructor(props: MenuItemProps) {
        this.id = props.id;
        this._name = props.name;
        this._category = props.category;
        if (props.description != null) {
            this._description = props.description;
        }
        this._available = props.available;
        this._sortOrder = props.sortOrder;
    }

    get name(): string {
        return this._name;
    }
    get category(): Category {
        return this._category;
    }
    get description(): string | undefined {
        return this._description;
    }
    get available(): boolean {
        return this._available;
    }
    get sortOrder(): number {
        return this._sortOrder;
    }

    static create(props: {
        name: string;
        category: Category;
        description?: string;
        available?: boolean;
        sortOrder?: number;
    }): Result<MenuItem, ValidationError> {
        if (!props.name.trim()) {
            return err(new ValidationError("Menu item name cannot be empty"));
        }

        const menuItem = new MenuItem({
            id: crypto.randomUUID(),
            name: props.name.trim(),
            category: props.category,
            ...(props.description != null && { description: props.description }),
            available: props.available ?? true,
            sortOrder: props.sortOrder ?? 0,
        });

        return ok(menuItem);
    }

    static reconstitute(props: MenuItemProps): MenuItem {
        return new MenuItem(props);
    }

    toggleAvailability(): void {
        this._available = !this._available;
    }

    update(props: {
        name?: string;
        category?: Category;
        description?: string;
        available?: boolean;
        sortOrder?: number;
    }): Result<void, ValidationError> {
        if (props.name !== undefined && !props.name.trim()) {
            return err(new ValidationError("Menu item name cannot be empty"));
        }

        if (props.name !== undefined) {
            this._name = props.name.trim();
        }
        if (props.category !== undefined) {
            this._category = props.category;
        }
        if (props.description !== undefined) {
            this._description = props.description;
        }
        if (props.available !== undefined) {
            this._available = props.available;
        }
        if (props.sortOrder !== undefined) {
            this._sortOrder = props.sortOrder;
        }

        return ok(undefined);
    }
}

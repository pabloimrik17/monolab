export interface SessionDto {
    id: string;
    name: string;
    code: string;
    status: "OPEN" | "CLOSED";
    createdAt: string; // ISO date
    closedAt: string | null;
}

export interface OrderItemDto {
    id: string;
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    customization: string | null;
}

export interface OrderDto {
    id: string;
    sessionId: string;
    guestName: string;
    items: OrderItemDto[];
    status: "PENDING" | "PREPARING" | "DONE" | "CANCELLED";
    notes: string | null;
    createdAt: string; // ISO date
    updatedAt: string; // ISO date
}

export interface MenuItemDto {
    id: string;
    name: string;
    category: "COFFEE" | "TEA" | "INFUSION" | "JUICE" | "OTHER";
    description: string | null;
    available: boolean;
    sortOrder: number;
}

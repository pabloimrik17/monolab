export interface CreateSessionRequest {
    name: string;
}

export interface CreateOrderRequest {
    sessionCode: string;
    guestName: string;
    items: { menuItemId: string; quantity: number; customization?: string }[];
    notes?: string;
}

export interface CreateMenuItemRequest {
    name: string;
    category: "COFFEE" | "TEA" | "INFUSION" | "JUICE" | "OTHER";
    description?: string;
    sortOrder?: number;
}

export interface UpdateMenuItemRequest {
    name?: string;
    category?: "COFFEE" | "TEA" | "INFUSION" | "JUICE" | "OTHER";
    description?: string;
    available?: boolean;
    sortOrder?: number;
}

export interface UpdateOrderStatusRequest {
    status: "PREPARING" | "DONE";
}

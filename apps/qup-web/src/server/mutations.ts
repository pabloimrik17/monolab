"use server";

import type {
    CreateMenuItemRequest,
    CreateOrderRequest,
    CreateSessionRequest,
    MenuItemDto,
    OrderDto,
    SessionDto,
    UpdateMenuItemRequest,
    UpdateOrderStatusRequest,
} from "@m0n0lab/qup-shared";

const API_URL = process.env["QUP_API_URL"] ?? "http://localhost:3001";

function adminHeaders(): Record<string, string> {
    const pin = process.env["API_ADMIN_PIN"];
    if (!pin) throw new Error("API_ADMIN_PIN is required");
    return { "X-Admin-Pin": pin };
}

async function post<T>(path: string, body?: unknown, admin = false): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(admin && adminHeaders()) },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown, admin = false): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(admin && adminHeaders()) },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
}

async function del(path: string, admin = false): Promise<void> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "DELETE",
        headers: { ...(admin && adminHeaders()) },
    });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}

// Orders (guest creates, admin updates status / cancels)
export async function createOrder(data: CreateOrderRequest): Promise<OrderDto> {
    return post<OrderDto>("/orders", data);
}

export async function updateOrderStatus(
    orderId: string,
    data: UpdateOrderStatusRequest,
): Promise<OrderDto> {
    return patch<OrderDto>(`/orders/${orderId}/status`, data, true);
}

export async function cancelOrder(orderId: string): Promise<void> {
    return del(`/orders/${orderId}`, true);
}

// Sessions (admin)
export async function createSession(data: CreateSessionRequest): Promise<SessionDto> {
    return post<SessionDto>("/sessions", data, true);
}

export async function closeSession(id: string): Promise<SessionDto> {
    return patch<SessionDto>(`/sessions/${id}/close`, {}, true);
}

// Menu (admin)
export async function createMenuItem(data: CreateMenuItemRequest): Promise<MenuItemDto> {
    return post<MenuItemDto>("/menu", data, true);
}

export async function updateMenuItem(
    id: string,
    data: UpdateMenuItemRequest,
): Promise<MenuItemDto> {
    return patch<MenuItemDto>(`/menu/${id}`, data, true);
}

export async function deleteMenuItem(id: string): Promise<void> {
    return del(`/menu/${id}`, true);
}

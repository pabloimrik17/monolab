"use server";

import { adminHeaders } from "./admin-guard.ts";
import { API_URL } from "./api-url.ts";
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

// Admin endpoints get the PIN header, which `adminHeaders` only hands out to an admin session.
async function authHeaders(admin: boolean): Promise<Record<string, string>> {
    return admin ? adminHeaders() : {};
}

async function post<T>(path: string, body?: unknown, admin = false): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders(admin)) },
        body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

async function patch(path: string, body: unknown, admin = false): Promise<void> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeaders(admin)) },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
}

async function del(path: string, admin = false): Promise<void> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "DELETE",
        headers: await authHeaders(admin),
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
): Promise<void> {
    return patch(`/orders/${orderId}/status`, data, true);
}

export async function cancelOrder(orderId: string): Promise<void> {
    return del(`/orders/${orderId}`, true);
}

// Sessions (admin)
export async function createSession(data: CreateSessionRequest): Promise<SessionDto> {
    return post<SessionDto>("/sessions", data, true);
}

export async function closeSession(id: string): Promise<void> {
    return patch(`/sessions/${id}/close`, {}, true);
}

// Menu (admin)
export async function createMenuItem(data: CreateMenuItemRequest): Promise<MenuItemDto> {
    return post<MenuItemDto>("/menu", data, true);
}

export async function updateMenuItem(id: string, data: UpdateMenuItemRequest): Promise<void> {
    return patch(`/menu/${id}`, data, true);
}

export async function deleteMenuItem(id: string): Promise<void> {
    return del(`/menu/${id}`, true);
}

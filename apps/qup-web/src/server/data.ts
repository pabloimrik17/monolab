"use server";

import type { MenuItemDto, OrderDto, SessionDto } from "@m0n0lab/qup-shared";

const API_URL = process.env["QUP_API_URL"] ?? "http://localhost:3001";

export async function getSessionByCode(code: string): Promise<SessionDto> {
    const res = await fetch(`${API_URL}/sessions/code/${code}`);
    if (!res.ok) throw new Error(`Session not found: ${code}`);
    return res.json() as Promise<SessionDto>;
}

export async function getMenu(): Promise<MenuItemDto[]> {
    const res = await fetch(`${API_URL}/menu`);
    if (!res.ok) throw new Error("Failed to load menu");
    return res.json() as Promise<MenuItemDto[]>;
}

export async function getSessionOrders(sessionId: string): Promise<OrderDto[]> {
    const res = await fetch(`${API_URL}/sessions/${sessionId}/orders`);
    if (!res.ok) throw new Error("Failed to load orders");
    return res.json() as Promise<OrderDto[]>;
}

export async function getActiveSessions(): Promise<SessionDto[]> {
    const res = await fetch(`${API_URL}/sessions?status=OPEN`);
    if (!res.ok) throw new Error("Failed to load sessions");
    return res.json() as Promise<SessionDto[]>;
}

export async function getSession(id: string): Promise<SessionDto> {
    const res = await fetch(`${API_URL}/sessions/${id}`);
    if (!res.ok) throw new Error("Session not found");
    return res.json() as Promise<SessionDto>;
}

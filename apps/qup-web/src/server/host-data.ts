"use server";

import { adminHeaders } from "./admin-guard.ts";
import type { OrderDto, SessionDto } from "@m0n0lab/qup-shared";

// Host reads: each one calls an adminOnly() endpoint, so each one first proves the
// caller holds an admin session and only then attaches the PIN.
const API_URL = process.env["QUP_API_URL"] ?? "http://localhost:3001";

export async function getSessionOrders(sessionId: string): Promise<OrderDto[]> {
    const res = await fetch(`${API_URL}/sessions/${sessionId}/orders`, {
        headers: await adminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load orders");
    return res.json() as Promise<OrderDto[]>;
}

export async function getActiveSessions(): Promise<SessionDto[]> {
    const res = await fetch(`${API_URL}/sessions?status=OPEN`, { headers: await adminHeaders() });
    if (!res.ok) throw new Error("Failed to load sessions");
    return res.json() as Promise<SessionDto[]>;
}

export async function getSession(id: string): Promise<SessionDto> {
    const res = await fetch(`${API_URL}/sessions/${id}`, { headers: await adminHeaders() });
    if (!res.ok) throw new Error("Session not found");
    return res.json() as Promise<SessionDto>;
}

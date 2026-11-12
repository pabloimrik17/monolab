"use server";

import type { MenuItemDto, SessionDto } from "@m0n0lab/qup-shared";

// Public reads only: every endpoint called here needs no admin PIN.
// Host reads live in host-data.ts behind the admin-session check.
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

export async function getAvailableMenu(): Promise<MenuItemDto[]> {
    const res = await fetch(`${API_URL}/menu?available=true`);
    if (!res.ok) throw new Error("Failed to load menu");
    return res.json() as Promise<MenuItemDto[]>;
}

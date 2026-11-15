"use server";

import type {
    MenuItemDto,
    PublicOrderBoardDto,
    PublicOrderSummaryDto,
    SessionDto,
} from "@m0n0lab/qup-shared";

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

// Public read: the board is reachable with the session code alone, so this function
// attaches no admin PIN and needs no admin session. The API's code-scoped status
// semantics are mapped to the board's states rather than thrown, because the board
// distinguishes "Session not found" (422/404) from "Session ended" (409).
export type PublicOrderBoardResult =
    | { status: "ok"; board: PublicOrderBoardDto }
    | { status: "not-found" }
    | { status: "ended" }
    | { status: "error"; message: string };

const BOARD_FAILURES: Record<number, PublicOrderBoardResult> = {
    404: { status: "not-found" },
    422: { status: "not-found" },
    409: { status: "ended" },
};

export async function getPublicOrderBoard(code: string): Promise<PublicOrderBoardResult> {
    const res = await fetch(`${API_URL}/sessions/code/${encodeURIComponent(code)}/board`);

    if (res.ok) {
        return { status: "ok", board: (await res.json()) as PublicOrderBoardDto };
    }
    return (
        BOARD_FAILURES[res.status] ?? {
            status: "error",
            message: `Failed to load board (${res.status})`,
        }
    );
}

// Public read: the guest status screen. `guest` is a filter the API applies, not a
// credential — the caller gets the same reduced projection the board does, so knowing a
// name buys no notes and no customizations. The screen only needs success or failure,
// so this throws rather than naming outcomes.
export async function getPublicGuestOrders(
    code: string,
    guest: string,
): Promise<PublicOrderSummaryDto[]> {
    const res = await fetch(
        `${API_URL}/sessions/code/${encodeURIComponent(code)}/orders?guest=${encodeURIComponent(guest)}`,
    );
    if (!res.ok) throw new Error(`Failed to load orders (${res.status})`);
    return res.json() as Promise<PublicOrderSummaryDto[]>;
}

"use server";

import { getCookie, setCookie } from "vinxi/http";

const ADMIN_PIN = process.env["API_ADMIN_PIN"] ?? "1234";
const COOKIE_NAME = "qup_admin";

export async function login(pin: string): Promise<{ success: boolean }> {
    if (pin !== ADMIN_PIN) {
        return { success: false };
    }

    setCookie(COOKIE_NAME, "authenticated", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8, // 8 hours
    });

    return { success: true };
}

export async function logout(): Promise<void> {
    setCookie(COOKIE_NAME, "", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
}

export async function isAuthenticated(): Promise<boolean> {
    const value = getCookie(COOKIE_NAME);
    return value === "authenticated";
}

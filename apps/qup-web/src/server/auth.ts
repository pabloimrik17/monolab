"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie } from "vinxi/http";

const ADMIN_PIN = process.env["API_ADMIN_PIN"];
const AUTH_SECRET = process.env["QUP_AUTH_SECRET"];
const COOKIE_NAME = "qup_admin";
const IS_PROD = process.env["NODE_ENV"] === "production";

if (!ADMIN_PIN || !AUTH_SECRET) {
    throw new Error("API_ADMIN_PIN and QUP_AUTH_SECRET env vars are required");
}

function sign(value: string): string {
    return createHmac("sha256", AUTH_SECRET!).update(value).digest("hex");
}

function cookiePayload(): string {
    const v = "authenticated";
    return `${v}.${sign(v)}`;
}

function isValidCookie(raw?: string): boolean {
    if (!raw) return false;
    const [v, sig] = raw.split(".");
    if (!v || !sig) return false;
    const expected = sign(v);
    return (
        expected.length === sig.length &&
        timingSafeEqual(Buffer.from(expected), Buffer.from(sig)) &&
        v === "authenticated"
    );
}

export async function login(pin: string): Promise<{ success: boolean }> {
    if (pin !== ADMIN_PIN) {
        return { success: false };
    }

    setCookie(COOKIE_NAME, cookiePayload(), {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8, // 8 hours
    });

    return { success: true };
}

export async function logout(): Promise<void> {
    setCookie(COOKIE_NAME, "", {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
}

export async function isAuthenticated(): Promise<boolean> {
    const value = getCookie(COOKIE_NAME);
    return isValidCookie(value);
}

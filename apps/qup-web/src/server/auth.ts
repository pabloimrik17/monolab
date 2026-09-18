"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getCookie, getRequestProtocol, setCookie } from "vinxi/http";

const COOKIE_NAME = "qup_admin";

// Read lazily: module top-level code of a "use server" file also ships in the
// client bundle, where these vars are absent and a top-level throw would break
// every page that imports the DI container.
function authEnv(): { pin: string; secret: string } {
    const pin = process.env["API_ADMIN_PIN"];
    const secret = process.env["QUP_AUTH_SECRET"];
    if (!pin || !secret) {
        throw new Error("API_ADMIN_PIN and QUP_AUTH_SECRET env vars are required");
    }
    return { pin, secret };
}

function sign(value: string): string {
    return createHmac("sha256", authEnv().secret).update(value).digest("hex");
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
    if (pin !== authEnv().pin) {
        return { success: false };
    }

    setCookie(COOKIE_NAME, cookiePayload(), {
        httpOnly: true,
        // Not tied to NODE_ENV: a production build served over plain http on the LAN
        // would otherwise set a Secure cookie the browser drops, blocking admin login.
        secure: getRequestProtocol() === "https",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8, // 8 hours
    });

    return { success: true };
}

export async function isAuthenticated(): Promise<boolean> {
    const value = getCookie(COOKIE_NAME);
    return isValidCookie(value);
}

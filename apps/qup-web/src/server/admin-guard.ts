import { isAuthenticated } from "./auth.ts";

// The PIN header is only obtainable by passing the admin-session check, so no
// server function can forward the PIN on behalf of an unauthenticated caller.
// Server functions have their own endpoints and are not covered by middleware.ts.
export async function adminHeaders(): Promise<Record<string, string>> {
    if (!(await isAuthenticated())) {
        throw new Error("Unauthorized");
    }
    const pin = process.env["API_ADMIN_PIN"];
    if (!pin) throw new Error("API_ADMIN_PIN is required");
    return { "X-Admin-Pin": pin };
}

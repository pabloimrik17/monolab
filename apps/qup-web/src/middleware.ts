import { createMiddleware } from "@solidjs/start/middleware";
import { sendRedirect } from "vinxi/http";
import { isAuthenticated } from "./server/auth.ts";

export default createMiddleware({
    onRequest: [
        async (event) => {
            const url = new URL(event.request.url);

            // Protect admin routes (except login page itself)
            if (url.pathname.startsWith("/admin/") && url.pathname !== "/admin/") {
                const authed = await isAuthenticated();
                if (!authed) {
                    return sendRedirect("/admin");
                }
            }
        },
    ],
});

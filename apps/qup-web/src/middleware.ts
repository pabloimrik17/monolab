import { createMiddleware } from "@solidjs/start/middleware";
import { getCookie, sendRedirect } from "vinxi/http";

export default createMiddleware({
    onRequest: [
        (event) => {
            const url = new URL(event.request.url);

            // Protect admin routes (except login page itself)
            if (url.pathname.startsWith("/admin/") && url.pathname !== "/admin/") {
                const cookie = getCookie("qup_admin");
                if (cookie !== "authenticated") {
                    return sendRedirect("/admin");
                }
            }
        },
    ],
});

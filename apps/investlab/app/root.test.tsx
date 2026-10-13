import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ErrorBoundary } from "./root";
import type { Route } from "./+types/root";

function render(error: unknown): string {
    return renderToStaticMarkup(<ErrorBoundary {...({ error } as Route.ErrorBoundaryProps)} />);
}

describe("root ErrorBoundary", () => {
    it("shows the status and message of a thrown route error response", () => {
        const html = render({
            status: 503,
            statusText: "Service Unavailable",
            internal: false,
            data: "InvestLab service is unavailable. Please try again later.",
        });

        expect(html).toContain("503");
        expect(html).toContain("InvestLab service is unavailable. Please try again later.");
    });

    it("shows a generic message for an unexpected error", () => {
        expect(render(new Error("boom"))).toContain("Something went wrong");
    });
});

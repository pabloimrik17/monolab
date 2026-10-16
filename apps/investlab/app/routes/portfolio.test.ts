import { beforeAll, describe, expect, it } from "vitest";
import type { Route } from "./+types/portfolio";

// Nothing listens on port 9: every API call fails as the network would.
beforeAll(() => {
    process.env["INVESTLAB_API_URL"] = "http://127.0.0.1:9";
    process.env["INVESTLAB_API_TOKEN"] = "test-token";
});

const ITEM_ID = "3f0c7c1e-6a3b-4f7a-9a43-6a1d2f3e4b5c";

function post(fields: Record<string, string>): Route.ActionArgs {
    const body = new FormData();
    for (const [name, value] of Object.entries(fields)) body.set(name, value);
    return {
        request: new Request("http://localhost/portfolio", { method: "POST", body }),
    } as Route.ActionArgs;
}

describe("portfolio loader", () => {
    it("answers 503 with a service-unavailable message when the API is down", async () => {
        const { loader } = await import("./portfolio");

        const response = await loader({} as Route.LoaderArgs).catch((thrown: unknown) => thrown);

        expect(response).toBeInstanceOf(Response);
        expect((response as Response).status).toBe(503);
        expect(await (response as Response).text()).toBe(
            "InvestLab service is unavailable. Please try again later.",
        );
    });
});

describe("portfolio action", () => {
    it("reports the service as unavailable when the API is down", async () => {
        const { action } = await import("./portfolio");

        const result = await action(post({ intent: "delete", id: ITEM_ID }));

        expect(result).toEqual({
            error: "InvestLab service is unavailable. Please try again later.",
        });
    });

    it("returns field errors without calling the API when the form is invalid", async () => {
        const { action } = await import("./portfolio");

        const result = await action(
            post({ intent: "update", id: ITEM_ID, broker: "", targetWeight: "150" }),
        );

        expect(result).toMatchObject({
            error: "Please fix the highlighted fields.",
            fieldErrors: { broker: expect.any(String), targetWeight: expect.any(String) },
        });
    });
});

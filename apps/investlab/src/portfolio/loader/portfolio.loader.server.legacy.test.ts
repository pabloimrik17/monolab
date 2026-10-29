import { beforeAll, describe, expect, it } from "vitest";
import type { LoaderFunctionArgs } from "react-router";

// Nothing listens on port 9: every API call fails as the network would.
beforeAll(() => {
    process.env["INVESTLAB_API_URL"] = "http://127.0.0.1:9";
    process.env["INVESTLAB_API_TOKEN"] = "test-token";
});

describe("portfolio loader", () => {
    it("answers 503 with a service-unavailable message when the API is down", async () => {
        const { loader } = await import("./portfolio.loader.server");

        const response = await loader({} as LoaderFunctionArgs).catch((thrown: unknown) => thrown);

        expect(response).toBeInstanceOf(Response);
        expect((response as Response).status).toBe(503);
        expect(await (response as Response).text()).toBe(
            "InvestLab service is unavailable. Please try again later.",
        );
    });
});

import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Layout } from "./root";

// Meta, Links, Scripts and ScrollRestoration need the framework's runtime context, which only a real server render provides.
vi.mock("react-router", async (importOriginal) => ({
    ...(await importOriginal<typeof import("react-router")>()),
    Meta: () => null,
    Links: () => null,
    Scripts: () => null,
    ScrollRestoration: () => null,
}));

describe("Layout", () => {
    it("links every page from the top navigation", () => {
        const html = renderToStaticMarkup(
            <StaticRouter location="/">
                <Layout>{null}</Layout>
            </StaticRouter>,
        );

        const nav = html.slice(html.indexOf('<nav class="top-nav">'), html.indexOf("</nav>"));
        const links = [...nav.matchAll(/<a href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(
            ([, href, label]) => [href, label],
        );
        expect(links).toEqual([
            ["/", "Tickers"],
            ["/portfolio", "Portfolio"],
            ["/roger", "Roger"],
        ]);
    });
});

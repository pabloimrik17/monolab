import { Container } from "inversify";
import { platformBrowserModule } from "@m0n0lab/investlab-platform/client";
import { quotesBrowserModule } from "@m0n0lab/investlab-quotes/browser";

// for hooks: only `src/di/` may import `./browser` entries
export { QUOTES } from "@m0n0lab/investlab-quotes/browser";

/** Browser composition root: browser modules only, so it never holds `Config` or the API token. */
function createContainer(): Container {
    const container = new Container();
    container.load(platformBrowserModule, quotesBrowserModule);
    return container;
}

let singleton: Container | null = null;

/** Exports are `undefined` during server render (`.client` module): call it from effects and event handlers only. */
export function getContainer(): Container {
    if (singleton === null) {
        singleton = createContainer();
    }
    return singleton;
}

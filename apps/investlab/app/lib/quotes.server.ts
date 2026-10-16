import { QUOTES } from "@m0n0lab/investlab-quotes/client";
import { getContainer } from "./container.server";

/** The quotes the API has for `symbols`, through the quotes module's client use case. */
export function listQuotes(symbols: string[]) {
    return getContainer().get(QUOTES.List).execute(symbols);
}

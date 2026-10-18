import { errAsync, okAsync } from "neverthrow";
import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/server";
import { BaseApiHarness } from "../testing/base-api-harness.ts";
import type { PortfolioItem } from "@m0n0lab/investlab-portfolio";
import type {
    PortfolioItemCreateError,
    PortfolioItemDeleteError,
    PortfolioItemList,
    PortfolioItemListError,
    PortfolioItemUpdateError,
} from "@m0n0lab/investlab-portfolio/server";

/** `/portfolio-items` over HTTP; each `given*` arranges one use case and returns its recorder. */
export class PortfolioItemsHarness extends BaseApiHarness {
    givenItems(list: PortfolioItemList) {
        return this.fake(PORTFOLIO.ItemList, okAsync(list));
    }

    givenListFails(error: PortfolioItemListError) {
        return this.fake(PORTFOLIO.ItemList, errAsync(error));
    }

    givenListThrows(error: Error) {
        return this.fakeThrowing(PORTFOLIO.ItemList, error);
    }

    givenCreateSucceeds(item: PortfolioItem) {
        return this.fake(PORTFOLIO.ItemCreate, okAsync(item));
    }

    givenCreateFails(error: PortfolioItemCreateError) {
        return this.fake(PORTFOLIO.ItemCreate, errAsync(error));
    }

    givenUpdateSucceeds(item: PortfolioItem) {
        return this.fake(PORTFOLIO.ItemUpdate, okAsync(item));
    }

    givenUpdateFails(error: PortfolioItemUpdateError) {
        return this.fake(PORTFOLIO.ItemUpdate, errAsync(error));
    }

    givenDeleteSucceeds() {
        return this.fake(PORTFOLIO.ItemDelete, okAsync(undefined));
    }

    givenDeleteFails(error: PortfolioItemDeleteError) {
        return this.fake(PORTFOLIO.ItemDelete, errAsync(error));
    }

    listItems(): Promise<Response> {
        return this.request("/portfolio-items");
    }

    createItem(body: unknown): Promise<Response> {
        return this.json("/portfolio-items", "POST", body);
    }

    /** POST with `body` sent as is, for payloads that are not JSON. */
    createItemFromRaw(body: string): Promise<Response> {
        return this.request("/portfolio-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    }

    updateItem(id: string, body: unknown): Promise<Response> {
        return this.json(`/portfolio-items/${id}`, "PUT", body);
    }

    deleteItem(id: string): Promise<Response> {
        return this.request(`/portfolio-items/${id}`, { method: "DELETE" });
    }
}

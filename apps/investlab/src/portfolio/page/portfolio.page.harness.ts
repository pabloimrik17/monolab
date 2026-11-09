import { errAsync, okAsync } from "neverthrow";
import { WebHarness } from "#core/harness/web.harness";
import * as portfolioRoute from "#routes/portfolio";
import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/client";
import type {
    PortfolioItemList,
    PortfolioItemListError,
} from "@m0n0lab/investlab-portfolio/client";

export interface PortfolioLaunchOptions {
    readonly items?: PortfolioItemList["items"];
    readonly instruments?: PortfolioItemList["instruments"];
    readonly loadFails?: PortfolioItemListError;
}

export class PortfolioPageHarness extends WebHarness {
    static launch({
        items = [],
        instruments = [],
        loadFails,
    }: PortfolioLaunchOptions = {}): Promise<PortfolioPageHarness> {
        return this.open(portfolioRoute, {
            url: "/portfolio",
            setup: (page) => {
                if (loadFails) {
                    page.givenLoadFails(loadFails);
                } else {
                    page.givenItems(items, instruments);
                }
            },
        });
    }

    givenItems(
        items: PortfolioItemList["items"],
        instruments: PortfolioItemList["instruments"] = [],
    ) {
        return this.fake(PORTFOLIO.ItemList, okAsync({ items, instruments }));
    }

    givenLoadFails(error: PortfolioItemListError) {
        return this.fake(PORTFOLIO.ItemList, errAsync(error));
    }

    givenDeleteSucceeds() {
        return this.fake(PORTFOLIO.ItemDelete, okAsync(undefined));
    }

    async deleteItem(symbol: string): Promise<void> {
        const button = this.row(symbol).getByRole("button", { name: "Delete" });
        await this.interact(() => this.acceptingConfirm(() => button.click()));
    }

    listedSymbols(): string[] {
        return this.visible(this.view.getByRole("row").getByRole("code")).map(
            (symbol) => symbol.textContent ?? "",
        );
    }

    private row(symbol: string) {
        return this.view.getByRole("row").filter({ hasText: symbol });
    }
}

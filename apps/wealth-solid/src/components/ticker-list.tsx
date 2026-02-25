import type { Quote, Ticker } from "@m0n0lab/wealth-tracker-core";
import { type Component, For, Show } from "solid-js";
import TickerRow from "./ticker-row";

interface TickerListProps {
    tickers: Ticker[];
    quotes: Map<string, Quote>;
    onRemove: (symbol: string) => void;
}

const TickerList: Component<TickerListProps> = (props) => {
    return (
        <Show
            when={props.tickers.length > 0}
            fallback={
                <div class="empty-state">
                    No tickers added yet. Add a symbol above to get started.
                </div>
            }
        >
            <div class="ticker-list">
                <For each={props.tickers}>
                    {(ticker) => (
                        <TickerRow
                            ticker={ticker}
                            quote={props.quotes.get(ticker.symbol)}
                            onRemove={props.onRemove}
                        />
                    )}
                </For>
            </div>
        </Show>
    );
};

export default TickerList;

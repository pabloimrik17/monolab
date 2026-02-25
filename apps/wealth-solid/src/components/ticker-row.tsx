import type { Quote, Ticker } from "@m0n0lab/wealth-tracker-core";
import type { Component } from "solid-js";

interface TickerRowProps {
    ticker: Ticker;
    quote: Quote | undefined;
    onRemove: (symbol: string) => void;
}

const TickerRow: Component<TickerRowProps> = (props) => {
    const changeClass = () => {
        if (!props.quote) return "";
        return props.quote.change >= 0 ? "positive" : "negative";
    };

    const formatPrice = () => {
        if (!props.quote) return "Loading...";
        return `$${props.quote.price.toFixed(2)}`;
    };

    const formatChange = () => {
        if (!props.quote) return "";
        const sign = props.quote.changePercent >= 0 ? "+" : "";
        return `${sign}${props.quote.changePercent.toFixed(2)}%`;
    };

    return (
        <div class="ticker-row">
            <span class="ticker-symbol">{props.ticker.symbol}</span>
            <span class={`ticker-price ${changeClass()}`}>{formatPrice()}</span>
            <span class={`ticker-change ${changeClass()}`}>
                {formatChange()}
            </span>
            <button
                class="remove-btn"
                onClick={() => props.onRemove(props.ticker.symbol)}
            >
                &times;
            </button>
        </div>
    );
};

export default TickerRow;

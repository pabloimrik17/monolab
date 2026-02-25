import type { Quote, Ticker } from "@m0n0lab/wealth-tracker-core";
import { TickerRow } from "./ticker-row";

interface TickerListProps {
    tickers: Ticker[];
    quotes: Map<string, Quote>;
    onRemove: (symbol: string) => void;
}

export function TickerList({ tickers, quotes, onRemove }: TickerListProps) {
    if (tickers.length === 0) {
        return (
            <div className="empty-state">
                No tickers added. Use the form above to add one.
            </div>
        );
    }

    const sorted = [...tickers].sort((a, b) =>
        a.symbol.localeCompare(b.symbol)
    );

    return (
        <div className="ticker-list">
            {sorted.map((ticker) => (
                <TickerRow
                    key={ticker.symbol}
                    ticker={ticker}
                    quote={quotes.get(ticker.symbol)}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
}

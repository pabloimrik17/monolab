import { TickerRow } from "./ticker-row.component";
import type { Quote, Ticker } from "@m0n0lab/investlab-quotes";
import type { FC } from "react";

interface TickerListProps {
    tickers: Ticker[];
    quotes: Map<string, Quote>;
    onRemove: (symbol: string) => void;
}

export const TickerList: FC<TickerListProps> = ({ tickers, quotes, onRemove }) => {
    if (tickers.length === 0) {
        return <div className="empty-state">No tickers added. Use the form above to add one.</div>;
    }

    const sorted = [...tickers].sort((a, b) => a.symbol.localeCompare(b.symbol));

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
};

import type { Quote, Ticker } from "@m0n0lab/wealth-tracker-core";

interface TickerRowProps {
    ticker: Ticker;
    quote: Quote | undefined;
    onRemove: (symbol: string) => void;
}

export function TickerRow({ ticker, quote, onRemove }: TickerRowProps) {
    return (
        <div className="ticker-row">
            <span className="ticker-symbol">{ticker.symbol}</span>
            {quote ? (
                <>
                    <span className="ticker-price">${quote.price.toFixed(2)}</span>
                    <span className={quote.changePercent >= 0 ? "positive" : "negative"}>
                        {quote.changePercent >= 0 ? "+" : ""}
                        {quote.changePercent.toFixed(2)}%
                    </span>
                </>
            ) : (
                <span className="loading">Loading...</span>
            )}
            <button
                className="remove-btn"
                aria-label={`Remove ${ticker.symbol}`}
                title={`Remove ${ticker.symbol}`}
                onClick={() => onRemove(ticker.symbol)}
            >
                &times;
            </button>
        </div>
    );
}

import { err, ok, type Result } from "neverthrow";
import { ValidationError } from "@m0n0lab/investlab-core";

export interface TickerProps {
    symbol: string;
    addedAt: Date;
}

export class Ticker {
    /** Letters, digits, dots and dashes, 1 to 15 characters; any case on input. */
    static readonly SYMBOL_FORMAT = /^[a-z0-9.-]{1,15}$/i;

    private readonly _symbol: string;
    private readonly _addedAt: Date;

    private constructor(props: TickerProps) {
        this._symbol = props.symbol;
        this._addedAt = props.addedAt;
    }

    get symbol(): string {
        return this._symbol;
    }
    get addedAt(): Date {
        return this._addedAt;
    }

    /** The symbol as tickers hold it: trimmed and uppercased. */
    static normalizeSymbol(symbol: string): string {
        return symbol.trim().toUpperCase();
    }

    static create(symbol: string): Result<Ticker, ValidationError> {
        const normalized = Ticker.normalizeSymbol(symbol);
        if (!Ticker.SYMBOL_FORMAT.test(normalized)) {
            return err(new ValidationError(`Invalid ticker symbol "${symbol}"`));
        }
        return ok(new Ticker({ symbol: normalized, addedAt: new Date() }));
    }

    static reconstitute(props: TickerProps): Ticker {
        return new Ticker(props);
    }
}

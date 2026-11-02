import { useState } from "react";

interface AddTickerProps {
    /** The refusal when the symbol was not followed; the input clears only on success. */
    onAdd: (symbol: string) => Error | undefined;
}

export function AddTicker({ onAdd }: AddTickerProps) {
    const [value, setValue] = useState("");
    const [refused, setRefused] = useState(false);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const refusal = onAdd(value);
        setRefused(refusal !== undefined);

        if (!refusal) {
            setValue("");
        }
    }

    return (
        <form
            className="add-form"
            onSubmit={handleSubmit}
        >
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    setValue(e.target.value);
                    setRefused(false);
                }}
                aria-invalid={refused || undefined}
                aria-describedby={refused ? "add-ticker-error" : undefined}
                placeholder="Enter ticker symbol"
                aria-label="Ticker symbol"
            />
            <button
                type="submit"
                disabled={!value.trim()}
            >
                Add
            </button>
            {refused && (
                <p
                    id="add-ticker-error"
                    role="alert"
                >
                    Invalid symbol: letters, digits, dot or dash, up to 15
                </p>
            )}
        </form>
    );
}

import { useState } from "react";

interface AddTickerProps {
    onAdd: (symbol: string) => void;
}

export function AddTicker({ onAdd }: AddTickerProps) {
    const [value, setValue] = useState("");

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = value.trim().toUpperCase();
        if (!trimmed) return;
        onAdd(trimmed);
        setValue("");
    }

    return (
        <form
            className="add-form"
            onSubmit={handleSubmit}
        >
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter ticker symbol"
                aria-label="Ticker symbol"
            />
            <button
                type="submit"
                disabled={!value.trim()}
            >
                Add
            </button>
        </form>
    );
}

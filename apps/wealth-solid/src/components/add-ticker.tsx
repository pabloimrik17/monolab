import { type Component, createSignal } from "solid-js";

interface AddTickerProps {
    onAdd: (symbol: string) => void;
}

const AddTicker: Component<AddTickerProps> = (props) => {
    const [symbol, setSymbol] = createSignal("");

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault();
        const value = symbol().trim().toUpperCase();
        if (value) {
            props.onAdd(value);
            setSymbol("");
        }
    };

    return (
        <form
            class="add-ticker"
            onSubmit={handleSubmit}
        >
            <input
                type="text"
                value={symbol()}
                onInput={(e) => setSymbol(e.currentTarget.value)}
                placeholder="Enter ticker symbol (e.g. AAPL)"
            />
            <button
                type="submit"
                disabled={!symbol().trim()}
            >
                Add
            </button>
        </form>
    );
};

export default AddTicker;

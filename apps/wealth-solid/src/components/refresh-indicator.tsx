import {
    type Component,
    createEffect,
    createSignal,
    onCleanup,
} from "solid-js";

interface RefreshIndicatorProps {
    lastUpdate: Date | null;
}

const RefreshIndicator: Component<RefreshIndicatorProps> = (props) => {
    const [display, setDisplay] = createSignal("");

    createEffect(() => {
        const update = props.lastUpdate;
        if (!update) {
            setDisplay("Waiting for data...");
            return;
        }

        const refresh = () => {
            const seconds = Math.floor((Date.now() - update.getTime()) / 1000);
            if (seconds < 5) setDisplay("Just updated");
            else if (seconds < 60) setDisplay(`Updated ${seconds}s ago`);
            else setDisplay(`Updated ${Math.floor(seconds / 60)}m ago`);
        };

        refresh();
        const id = setInterval(refresh, 1000);
        onCleanup(() => clearInterval(id));
    });

    return <div class="refresh-indicator">{display()}</div>;
};

export default RefreshIndicator;

import { useEffect, useId, useRef, useState } from "react";
import type { EntryTransitionAction } from "#roger/view-model/roger.view-model";
import type { RogerState } from "@m0n0lab/investlab-roger";

interface TransitionMenuProps {
    transitions: EntryTransitionAction[];
    onChoose: (to: RogerState) => void;
}

const GAP_PX = 4;

export function TransitionMenu({
    transitions,
    onChoose,
}: TransitionMenuProps): React.JSX.Element | null {
    const id = useId();
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    // The panel is fixed, so scrolling or resizing would leave it detached from its trigger.
    useEffect(() => {
        if (!open) return;
        const close = () => panel.current?.hidePopover();
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [open]);

    if (transitions.length === 0) {
        return null;
    }

    // A fixed popover sits in the top layer, so it is placed from the trigger's rect before it shows.
    const place = (event: React.ToggleEvent<HTMLDivElement>) => {
        const rect = trigger.current?.getBoundingClientRect();
        if (event.newState !== "open" || !rect) {
            return;
        }
        event.currentTarget.style.top = `${rect.bottom + GAP_PX}px`;
        event.currentTarget.style.right = `${document.documentElement.clientWidth - rect.right}px`;
    };

    return (
        <>
            <button
                ref={trigger}
                type="button"
                popoverTarget={id}
            >
                Move to <span aria-hidden="true">▾</span>
            </button>
            <div
                ref={panel}
                popover="auto"
                id={id}
                className="roger-menu"
                onBeforeToggle={place}
                onToggle={(event) => setOpen(event.newState === "open")}
            >
                {transitions.map(({ to, label }) => (
                    <button
                        key={to}
                        type="button"
                        onClick={() => {
                            panel.current?.hidePopover();
                            onChoose(to);
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </>
    );
}

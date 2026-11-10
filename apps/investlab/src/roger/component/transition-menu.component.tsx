import { useId, useRef } from "react";
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

    if (transitions.length === 0) {
        return null;
    }

    // A fixed popover sits in the top layer, so it is placed from the trigger's rect when it opens.
    const place = (event: React.ToggleEvent<HTMLDivElement>) => {
        const rect = trigger.current?.getBoundingClientRect();
        if (event.newState !== "open" || !rect) {
            return;
        }
        event.currentTarget.style.top = `${rect.bottom + GAP_PX}px`;
        event.currentTarget.style.right = `${window.innerWidth - rect.right}px`;
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
                onToggle={place}
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

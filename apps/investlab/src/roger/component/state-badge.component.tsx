import { STATE_FAMILIES, STATE_LABELS } from "#roger/view-model/roger.view-model";
import type { RogerState } from "@m0n0lab/investlab-roger";
import type { FC } from "react";

interface StateBadgeProps {
    state: RogerState;
}

export const StateBadge: FC<StateBadgeProps> = ({ state }) => {
    return (
        <span className={`badge roger-badge-${STATE_FAMILIES[state]}`}>{STATE_LABELS[state]}</span>
    );
};

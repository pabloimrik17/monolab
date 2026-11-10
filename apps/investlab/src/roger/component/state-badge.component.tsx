import { STATE_LABELS, stateFamily } from "#roger/view-model/roger.view-model";
import type { RogerState } from "@m0n0lab/investlab-roger";

export function StateBadge({ state }: { state: RogerState }): React.JSX.Element {
    return (
        <span className={`badge roger-badge roger-badge-${stateFamily(state)}`}>
            {STATE_LABELS[state]}
        </span>
    );
}

import { STATE_LABELS } from "#roger/view-model/roger.view-model";
import type { RogerState } from "@m0n0lab/investlab-roger";

export function StateBadge({ state }: { state: RogerState }): React.JSX.Element {
    return <span className="badge badge-type">{STATE_LABELS[state]}</span>;
}

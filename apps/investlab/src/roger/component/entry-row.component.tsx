import { useFetcher } from "react-router";
import { StateBadge } from "#roger/component/state-badge.component";
import type { RogerActionResult } from "#roger/form/entry.form";
import type { EntryRowView, EntryView } from "#roger/view-model/roger.view-model";
import type { RogerState } from "@m0n0lab/investlab-roger";

export interface EntryRowActions {
    onEdit: (entry: EntryView) => void;
    onTransition: (entry: EntryView, to: RogerState) => void;
    onReEnter: (entry: EntryView) => void;
}

interface EntryRowProps extends EntryRowActions {
    row: EntryRowView;
    showSymbol: boolean;
}

export function EntryRow({
    row,
    showSymbol,
    onEdit,
    onTransition,
    onReEnter,
}: EntryRowProps): React.JSX.Element {
    const fetcher = useFetcher<RogerActionResult>();
    const isDeleting = fetcher.state !== "idle";
    const deleteError = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;
    const { entry } = row;

    return (
        <tr>
            {showSymbol ? (
                <td>
                    <code>{entry.instrument.symbol}</code>
                </td>
            ) : null}
            <td>
                <StateBadge state={entry.state} />
            </td>
            {row.cells.map(({ field, text }) => (
                <td key={field}>{text}</td>
            ))}
            <td>
                <div className="roger-actions">
                    <button
                        type="button"
                        onClick={() => onEdit(entry)}
                    >
                        Edit
                    </button>
                    {row.transitions.map(({ to, label }) => (
                        <button
                            key={to}
                            type="button"
                            onClick={() => onTransition(entry, to)}
                        >
                            {label}
                        </button>
                    ))}
                    {row.canReEnter ? (
                        <button
                            type="button"
                            onClick={() => onReEnter(entry)}
                        >
                            Re-enter
                        </button>
                    ) : null}
                    <fetcher.Form method="post">
                        <input
                            type="hidden"
                            name="intent"
                            value="delete"
                        />
                        <input
                            type="hidden"
                            name="id"
                            value={entry.id}
                        />
                        <button
                            type="submit"
                            disabled={isDeleting}
                            onClick={(e) => {
                                if (!confirm("Delete this entry?")) {
                                    e.preventDefault();
                                }
                            }}
                        >
                            {isDeleting ? "Deleting…" : "Delete"}
                        </button>
                    </fetcher.Form>
                </div>
                {deleteError ? <p className="form-error">{deleteError}</p> : null}
            </td>
        </tr>
    );
}

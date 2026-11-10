import { EntryRow, type EntryRowActions } from "#roger/component/entry-row.component";
import type {
    EntryColumnView,
    EntrySectionView,
    SortColumn,
} from "#roger/view-model/roger.view-model";
import type { FC } from "react";

interface GroupedEntryTableProps extends EntryRowActions {
    sections: EntrySectionView[];
    columns: EntryColumnView[];
    showSymbol: boolean;
    emptyMessage: string;
    onSort: (column: SortColumn) => void;
}

const SORT_ARROWS = { ascending: "↑", descending: "↓" } as const;

interface ColumnHeaderProps {
    column: EntryColumnView;
    onSort: (column: SortColumn) => void;
}

const ColumnHeader: FC<ColumnHeaderProps> = ({ column, onSort }) => {
    return (
        <th
            scope="col"
            aria-sort={column.sort}
            className={column.numeric ? "roger-numeric" : undefined}
        >
            {column.sortable ? (
                <button
                    type="button"
                    onClick={() => onSort(column.column)}
                >
                    {column.label}
                    {column.sort ? (
                        <span aria-hidden="true"> {SORT_ARROWS[column.sort]}</span>
                    ) : null}
                </button>
            ) : (
                column.label
            )}
        </th>
    );
};

export const GroupedEntryTable: FC<GroupedEntryTableProps> = ({
    sections,
    columns,
    showSymbol,
    emptyMessage,
    onSort,
    ...rowActions
}) => {
    if (sections.length === 0) {
        return (
            <div className="empty-state">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="roger-table-scroll">
            <table className="portfolio-table roger-table">
                <thead>
                    <tr>
                        {showSymbol ? <th scope="col">Symbol</th> : null}
                        {columns.map((column) => (
                            <ColumnHeader
                                key={column.column}
                                column={column}
                                onSort={onSort}
                            />
                        ))}
                        <th scope="col">Actions</th>
                    </tr>
                </thead>
                {sections.map(({ key, heading, rows }) => {
                    const headingId = `roger-group-${key}`;
                    return (
                        <tbody
                            key={key}
                            aria-labelledby={heading ? headingId : undefined}
                        >
                            {heading ? (
                                <tr>
                                    <td colSpan={columns.length + 1}>
                                        <div className="roger-group-heading">
                                            <h2 id={headingId}>{heading.symbol}</h2>
                                            <span>{heading.name}</span>
                                            {heading.sector ? (
                                                <span className="badge roger-sector">
                                                    {heading.sector}
                                                </span>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ) : null}
                            {rows.map((row) => (
                                <EntryRow
                                    key={row.entry.id}
                                    row={row}
                                    showSymbol={showSymbol}
                                    {...rowActions}
                                />
                            ))}
                        </tbody>
                    );
                })}
            </table>
        </div>
    );
};

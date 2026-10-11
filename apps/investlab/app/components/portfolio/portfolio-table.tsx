import { PortfolioItemRow } from "./portfolio-item-row";
import type { PortfolioItemView } from "./types";

export interface PortfolioTableProps {
    items: PortfolioItemView[];
    onEdit: (item: PortfolioItemView) => void;
}

export function PortfolioTable({ items, onEdit }: PortfolioTableProps) {
    if (items.length === 0) {
        return (
            <div className="empty-state">
                <p>No portfolio items yet.</p>
                <p>Add your first item to get started.</p>
            </div>
        );
    }

    return (
        <table className="portfolio-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Asset class</th>
                    <th>Broker</th>
                    <th>Target weight</th>
                    <th>Current value</th>
                    <th>Replicates</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item) => (
                    <PortfolioItemRow
                        key={item.id}
                        item={item}
                        onEdit={onEdit}
                    />
                ))}
            </tbody>
        </table>
    );
}

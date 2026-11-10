import { useFetcher } from "react-router";
import type { PortfolioActionResult } from "#portfolio/form/portfolio-item.form";
import type { PortfolioItemView } from "#portfolio/view-model/portfolio.view-model";
import type { FC } from "react";

const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
});

export interface PortfolioItemRowProps {
    item: PortfolioItemView;
    onEdit: (item: PortfolioItemView) => void;
}

export const PortfolioItemRow: FC<PortfolioItemRowProps> = ({ item, onEdit }) => {
    const fetcher = useFetcher<PortfolioActionResult>();
    const isDeleting = fetcher.state !== "idle";
    const deleteError = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;

    return (
        <tr>
            <td>{item.instrument.name}</td>
            <td>
                <code>{item.instrument.symbol}</code>
            </td>
            <td>
                <span className="badge badge-type">{item.instrument.type}</span>
            </td>
            <td>
                <span className="badge badge-asset">{item.instrument.assetClass}</span>
            </td>
            <td>{item.broker}</td>
            <td>{item.targetWeight.toFixed(2)}%</td>
            <td>{currency.format(item.currentValue)}</td>
            <td>{item.instrument.replicates ?? "—"}</td>
            <td>
                <button
                    type="button"
                    onClick={() => onEdit(item)}
                >
                    Edit
                </button>
                <fetcher.Form
                    method="post"
                    style={{ display: "inline" }}
                >
                    <input
                        type="hidden"
                        name="intent"
                        value="delete"
                    />
                    <input
                        type="hidden"
                        name="id"
                        value={item.id}
                    />
                    <button
                        type="submit"
                        disabled={isDeleting}
                        onClick={(e) => {
                            if (!confirm("Delete this portfolio item?")) {
                                e.preventDefault();
                            }
                        }}
                    >
                        {isDeleting ? "Deleting…" : "Delete"}
                    </button>
                </fetcher.Form>
                {deleteError ? <p className="form-error">{deleteError}</p> : null}
            </td>
        </tr>
    );
};

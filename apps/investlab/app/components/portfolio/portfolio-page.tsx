import { PortfolioItemForm } from "./portfolio-item-form";
import { PortfolioTable } from "./portfolio-table";
import { usePortfolioViewModel } from "./use-portfolio-view-model";
import type { InstrumentOption, PortfolioItemView } from "./types";

export interface PortfolioPageProps {
    items: PortfolioItemView[];
    instruments: InstrumentOption[];
    error?: string | undefined;
}

export function PortfolioPage({ items, instruments, error }: PortfolioPageProps) {
    const vm = usePortfolioViewModel(items, instruments);

    return (
        <div className="portfolio">
            <header className="portfolio-header">
                <h1>Portfolio</h1>
                {!vm.isFormOpen ? (
                    <button
                        type="button"
                        onClick={vm.openCreate}
                    >
                        Add item
                    </button>
                ) : null}
            </header>

            {error ? <p className="form-error">{error}</p> : null}

            {vm.isFormOpen ? (
                <PortfolioItemForm
                    instruments={vm.instruments}
                    editing={vm.editing}
                    onDone={vm.closeForm}
                />
            ) : null}

            <PortfolioTable
                items={vm.items}
                onEdit={vm.openEdit}
            />
        </div>
    );
}

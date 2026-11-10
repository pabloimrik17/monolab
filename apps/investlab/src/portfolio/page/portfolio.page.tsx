import { PortfolioItemForm } from "#portfolio/component/portfolio-item-form.component";
import { PortfolioTable } from "#portfolio/component/portfolio-table.component";
import { usePortfolioViewModel } from "#portfolio/view-model/portfolio.view-model";
import type {
    InstrumentOption,
    PortfolioItemView,
} from "#portfolio/view-model/portfolio.view-model";
import type { FC } from "react";

export interface PortfolioPageProps {
    items: PortfolioItemView[];
    instruments: InstrumentOption[];
}

export const PortfolioPage: FC<PortfolioPageProps> = ({ items, instruments }) => {
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

            {vm.isFormOpen ? (
                <PortfolioItemForm
                    key={vm.formKey}
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
};

import { PortfolioItemForm } from "#portfolio/component/portfolio-item-form.component";
import { PortfolioTable } from "#portfolio/component/portfolio-table.component";
import { usePortfolioViewModel } from "#portfolio/view-model/portfolio.view-model";
import type {
    InstrumentOption,
    PortfolioItemView,
} from "#portfolio/view-model/portfolio.view-model";

export interface PortfolioPageProps {
    loaderData: { items: PortfolioItemView[]; instruments: InstrumentOption[] };
}

export default function PortfolioPage({ loaderData }: PortfolioPageProps) {
    const vm = usePortfolioViewModel(loaderData.items, loaderData.instruments);

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
}

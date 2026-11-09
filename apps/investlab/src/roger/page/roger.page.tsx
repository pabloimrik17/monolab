import { Link } from "react-router";
import { EntryForm } from "#roger/component/entry-form.component";
import { GroupedEntryTable } from "#roger/component/grouped-entry-table.component";
import { TransitionForm } from "#roger/component/transition-form.component";
import {
    existingEntryForm,
    STATE_FILTER_OPTIONS,
    useRogerViewModel,
    type RogerPageData,
    type RogerViewModel,
} from "#roger/view-model/roger.view-model";

function OpenForm({ vm }: { vm: RogerViewModel }) {
    if (!vm.form) return null;
    return vm.form.kind === "create" ? (
        <EntryForm
            key={vm.formKey}
            instruments={vm.instruments}
            onDone={vm.closeForm}
        />
    ) : (
        <TransitionForm
            key={vm.formKey}
            form={existingEntryForm(vm.form)}
            onDone={vm.closeForm}
        />
    );
}

function ViewSwitch({ view }: { view: RogerPageData["view"] }) {
    return (
        <nav aria-label="Roger view">
            <Link
                to="/roger"
                aria-current={view === "active" ? "page" : undefined}
            >
                Active
            </Link>
            <Link
                to="/roger?view=history"
                aria-current={view === "history" ? "page" : undefined}
            >
                History
            </Link>
        </nav>
    );
}

function StateFilter({ vm }: { vm: RogerViewModel }) {
    return (
        <label>
            Filter by state
            <select
                value={vm.stateFilter ?? ""}
                onChange={(e) => vm.selectStateFilter(e.target.value)}
            >
                <option value="">All states</option>
                {STATE_FILTER_OPTIONS.map(({ value, label }) => (
                    <option
                        key={value}
                        value={value}
                    >
                        {label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function RogerContent(data: RogerPageData) {
    const vm = useRogerViewModel(data);

    return (
        <div className="portfolio roger">
            <header className="portfolio-header">
                <h1>Roger</h1>
                {vm.form ? null : (
                    <button
                        type="button"
                        onClick={vm.openCreate}
                    >
                        Add entry
                    </button>
                )}
            </header>

            <div className="roger-toolbar">
                <ViewSwitch view={vm.view} />
                {vm.showStateFilter ? <StateFilter vm={vm} /> : null}
            </div>

            <OpenForm vm={vm} />

            <GroupedEntryTable
                sections={vm.sections}
                columns={vm.columns}
                showSymbol={vm.showSymbol}
                emptyMessage={vm.emptyMessage}
                onSort={vm.toggleSort}
                onEdit={vm.openEdit}
                onTransition={vm.openTransition}
                onReEnter={vm.openReEnter}
            />
        </div>
    );
}

// Keyed by view so filter, sort and any open form do not carry over between the two lists.
export function RogerPage(data: RogerPageData): React.JSX.Element {
    return (
        <RogerContent
            key={data.view}
            {...data}
        />
    );
}

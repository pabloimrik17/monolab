## Why

The user follows Roger, a trader, and tracks each of his stock calls by hand: from the radar, through buy and sell orders, to the sale. InvestLab has no place for that lifecycle, and the later Roger changes (metrics, sectors, dashboard) and the global portfolio need it as their source. This change adds it on top of the shared instrument catalog (`investlab-instrument-catalog`), so the global portfolio can see Roger's holdings by the same instruments.

## What Changes

- New module package `@m0n0lab/investlab-roger`, a leaf that depends only on the catalog ([ADR 0010](../../../docs/adr/0010-investlab-module-dependencies.md)): edge roger → catalog, and no module imports roger.
- **Entry**: one trade of a stock that follows Roger, linked to a catalog instrument. An instrument may have several entries.
- **Seven Roger states**: `WATCHING`, `SHORTLISTED` and `TRADER_BOUGHT` (the radar), `BUY_ORDER`, `INVESTED`, `SELL_ORDER` and `SOLD`, with a fixed transition table, a market buy (radar → `INVESTED`), a manual sale (`INVESTED` → `SOLD`), and `SOLD` as a final state kept as history.
- **Fields per state**: entry price on the radar; quantity from `BUY_ORDER`; buy commission and buy date from `INVESTED`; exit price from `SELL_ORDER`; sell commission and sell date at `SOLD`. Each entry records since when it is in its state.
- **Re-entry**: from a sold entry, a new entry in `BUY_ORDER` with its price and quantity pre-filled.
- **Create** an entry in any state, for an existing instrument or for a new stock created on the fly in the catalog. **Edit** the fields of the current state. **Delete** in any state.
- **API**: `/roger/entries` endpoints for list (active or history), create, edit, delete, transition and re-entry.
- **Web**: a `/roger` tab with the active entries grouped by instrument, sortable and filterable by state, state badges, only the valid transitions as actions, transition and re-entry forms that ask exactly the target state's fields, and a history view of sold entries.

## Capabilities

### New Capabilities

- `roger-state-machine`: the Roger states, the transition table, the fields each state carries, how a transition fills and clears them, value rules, time in state, and re-entry.
- `roger-entry-management`: creating (with an existing or a new instrument), editing, deleting and listing entries, the history of sold entries, and the `/roger` page and its forms.

### Modified Capabilities

- `investlab-module-packages`: the roger module package, the edge roger → catalog, roger as a leaf, and the apps' containers loading roger.
- `investlab-http-api`: the Roger entry endpoints, their error codes, the complete route list and the API container.

## Impact

- **New package**: `packages/investlab-roger` (entries `.`, `./server`, `./client`, `./testing`), coverage at 80 and Stryker.
- **Database**: a new `roger_entries` table with a foreign key to `instruments`, through a new migration in `@m0n0lab/investlab-database`.
- **API**: routes in `apps/investlab-api/src/roger/route/`; the container loads the roger server module.
- **Web**: `apps/investlab/src/roger/`, `src/routes/roger.tsx` and a "Roger" link in the top navigation.
- **Lint**: `eslint.config.ts` adds `roger` to the modules and `roger: ["catalog"]` to the declared edges.
- **Prerequisites**: `investlab-instrument-catalog` (base of this stack) and `agentic-task-3ao3` (UI harness, needed by the web part).
- **Follow-ups outside this change**: the stale-ticker cleanup and the Roger summary go to `investlab-roger-dashboard`; the stock-picking summary goes to `investlab-overview`; the state badges and transition buttons leave `investlab-roger-metrics-ui`, which this change now owns.

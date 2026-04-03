## Context

InvestLab portfolio module needs a way to represent what the user holds. The Instrument entity (from foundation) defines what an instrument *is*; PortfolioItem defines the user's *relationship* to it — where they hold it, how much weight it should have, what it's currently worth.

User's portfolio includes: ETF gold and Nasdaq, direct BTC, index funds via MyInvestor, individual stocks via Roger. Each has a broker/platform and target allocation weight.

## Goals / Non-Goals

**Goals:**

- PortfolioItem CRUD with full instrument context displayed
- Table view showing instrument name, type, asset class, broker, target weight, current value, whether it replicates an index
- Leverage existing Instrument entity — PortfolioItem references it by ID, not duplication

**Non-Goals:**

- Automatic value updates (returns module territory)
- Contribution tracking (allocations module territory)
- Broker as a separate entity — free text field for now, formalize later if needed
- Portfolio sharing or multi-user

## Decisions

### 1. PortfolioItem entity in investlab-domain

```
PortfolioItem {
  id: uuid
  instrumentId: uuid        // FK to Instrument
  broker: string            // "MyInvestor", "Binance", "Interactive Brokers"
  targetWeight: number      // 0-100, percentage of portfolio
  currentValue: number      // Manual entry for now (€)
  notes?: string            // Optional free text
  createdAt: Date
  updatedAt: Date
}
```

**Why separate entity, not extending Instrument**: Instrument is a shared catalog (used by Roger too). PortfolioItem is portfolio-specific context. One instrument can appear in multiple portfolio items (e.g., same ETF at two brokers).

### 2. Route structure — /portfolio as main entry

`/portfolio` renders a table of all PortfolioItem rows joined with their Instrument data. Each row shows: instrument name, symbol, type badge, asset class badge, broker, target weight %, current value, replicates (if any).

CRUD operations via modal or inline form — create selects from existing instruments or creates new one inline.

### 3. Use cases follow QUP DDD pattern

- `CreatePortfolioItemUseCase`: validates instrument exists, creates item, persists
- `UpdatePortfolioItemUseCase`: finds item, updates mutable fields (broker, weight, value, notes)
- `DeletePortfolioItemUseCase`: removes item by ID
- `ListPortfolioItemsUseCase`: returns all items with resolved instrument data

All `@injectable()`, return `ResultAsync`, use repository interface.

### 4. Drizzle schema — portfolio_items table

```sql
portfolio_items (
  id UUID PK DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  broker VARCHAR(100) NOT NULL,
  target_weight NUMERIC(5,2) NOT NULL DEFAULT 0,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

Index on `instrument_id`. No unique constraint on (instrument_id, broker) — user might track the same instrument at the same broker as separate line items.

## Risks / Trade-offs

- **[Target weights don't need to sum to 100%]** — User might be in transition, adding items incrementally. UI can warn but not enforce. Keeps it flexible.
- **[Current value is manual entry]** — Returns module will add automatic pricing for quotable instruments. For now, manual keeps it simple and works for all instrument types including non-quotable index funds.
- **[Broker as free text]** — Could lead to inconsistencies ("MyInvestor" vs "myinvestor"). Acceptable for single user. Could add normalization or autocomplete later.

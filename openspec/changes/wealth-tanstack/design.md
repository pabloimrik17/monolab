## Context

TanStack Start app consuming `@m0n0lab/wealth-tracker-core`. Fourth and final framework implementation for DX comparison. TanStack Start has native TanStack Query integration - this enables comparing Query's `refetchInterval` vs core's custom polling.

## Goals / Non-Goals

**Goals:**
- Scaffold using official CLI (`pnpm create @tanstack/app`)
- Integrate with wealth-tracker-core via workspace dependency
- Idiomatic TanStack patterns (Router, Query)
- Compare two polling approaches: TanStack Query vs core poller
- Minimal styling (functional over pretty for MVP)

**Non-Goals:**
- SSR optimization (client-only for MVP)
- Server functions (client-only for API key simplicity)
- Tests
- PWA or offline support

## Decisions

### 1. Use TanStack Query for quote fetching (not core poller)

```typescript
const { data: quotes } = useQuery({
  queryKey: ['quotes', tickers],
  queryFn: () => finnhubClient.getQuotes(tickers),
  refetchInterval: 30_000,
});
```

**Rationale**: Main differentiator of TanStack Start. Compare DX of native Query polling vs core's callback-based poller. Core still provides the Finnhub client, just not the poller.

### 2. Still use core's TickerStore

```typescript
// Core handles persistence, Query handles fetching
const store = createTickerStore(localStorage);
const [tickers, setTickers] = useState(store.getTickers());
```

**Rationale**: Persistence logic stays in core, only polling differs.

### 3. Typed routes native (no codegen step)

TanStack Router has built-in type inference, no separate codegen needed.

**Rationale**: Part of the DX comparison - less build complexity.

### 4. File structure

```
app/
├── routes/
│   ├── __root.tsx    # Root layout
│   └── index.tsx     # Main page
├── components/
│   ├── ticker-list.tsx
│   ├── ticker-row.tsx
│   └── add-ticker.tsx
└── lib/
    └── wealth.ts     # Core service init (no poller)
```

**Rationale**: Standard TanStack Start conventions.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| API key in client | Document env setup |
| TanStack Start beta | Pin versions, expect some rough edges |
| Different polling approach | Document comparison insights |

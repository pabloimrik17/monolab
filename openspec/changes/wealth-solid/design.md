## Context

SolidStart app consuming `@m0n0lab/wealth-tracker-core` for business logic. UI-only implementation focused on displaying ticker list with live quotes. First of 4 framework implementations for DX comparison.

## Goals / Non-Goals

**Goals:**
- Scaffold using official CLI (`pnpm create solid`)
- Integrate with wealth-tracker-core via workspace dependency
- Idiomatic SolidStart patterns (file-based routing, signals, createResource)
- Minimal styling (functional over pretty for MVP)

**Non-Goals:**
- SSR/hydration optimization (client-only is fine for MVP)
- Custom theming or design system
- Tests (focus on DX comparison, not coverage)
- PWA or offline support

## Decisions

### 1. Client-side only rendering

SolidStart supports SSR but quotes need client-side API key. Keep it simple with `ssr: false` in config.

**Rationale**: Avoids complexity of server-side API proxying for MVP.

### 2. Signals for reactive state

```typescript
const [tickers, setTickers] = createSignal<Ticker[]>([]);
const [quotes, setQuotes] = createSignal<Map<string, Quote>>(new Map());
```

**Rationale**: Native Solid pattern, fine-grained updates perfect for quote changes.

### 3. Connect core poller to signals via callbacks

```typescript
const poller = createQuotePoller(client);
poller.start(tickers(), (newQuotes) => setQuotes(newQuotes));
```

**Rationale**: Core uses callbacks, Solid wraps them in signals. Clean separation.

### 4. Single route with component composition

```
routes/
└── index.tsx       # Main page
components/
├── ticker-list.tsx
├── ticker-row.tsx
└── add-ticker.tsx
```

**Rationale**: Simple app, one route sufficient. Components for organization.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| API key in client bundle | Document env setup, note production needs proxy |
| SolidStart beta quirks | Pin versions, check docs for breaking changes |

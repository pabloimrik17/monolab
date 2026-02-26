## Context

SvelteKit app consuming `@m0n0lab/wealth-tracker-core` for business logic. Second framework implementation for DX comparison. Svelte uses compiler-based reactivity vs signal-based (Solid) or VDOM (React).

## Goals / Non-Goals

**Goals:**
- Scaffold using official CLI (`pnpm create svelte`)
- Integrate with wealth-tracker-core via workspace dependency
- Idiomatic Svelte patterns (stores, reactive statements, components)
- Minimal styling (functional over pretty for MVP)

**Non-Goals:**
- SSR optimization (client-only for MVP)
- Svelte 5 runes (stick with Svelte 4 stores for stability)
- Tests
- PWA or offline support

## Decisions

### 1. Client-side only rendering

Disable SSR for simplicity since we need client-side API key.

```typescript
// +page.ts
export const ssr = false;
```

**Rationale**: Same as other apps - avoid server proxy complexity.

### 2. Svelte stores for reactive state

```typescript
// lib/stores.ts
export const tickers = writable<Ticker[]>([]);
export const quotes = writable<Map<string, Quote>>(new Map());
```

**Rationale**: Native Svelte pattern, auto-subscribes in components with `$` prefix.

### 3. Connect core poller via store subscription

```typescript
poller.start($tickers, (newQuotes) => quotes.set(newQuotes));
```

**Rationale**: Core callbacks map directly to store.set().

### 4. File structure

```
src/
├── lib/
│   ├── stores.ts       # Svelte stores
│   └── wealth.ts       # Core service init
├── routes/
│   └── +page.svelte    # Main page
└── components/
    ├── TickerList.svelte
    ├── TickerRow.svelte
    └── AddTicker.svelte
```

**Rationale**: Standard SvelteKit conventions.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| API key in client | Document env setup |
| Svelte 5 migration later | Use patterns that translate to runes |

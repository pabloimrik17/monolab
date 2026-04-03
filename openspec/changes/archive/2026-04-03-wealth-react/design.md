## Context

React Router v7 app (framework mode) consuming `@m0n0lab/wealth-tracker-core`. Third framework implementation for DX comparison. React Router v7 is the successor to Remix, using loaders/actions pattern with typed routes via codegen.

## Goals / Non-Goals

**Goals:**
- Scaffold using official CLI (`pnpm create react-router`)
- Integrate with wealth-tracker-core via workspace dependency
- Idiomatic React Router patterns (loaders, actions, typed routes)
- Enable route type generation for type-safe navigation
- Minimal styling (functional over pretty for MVP)

**Non-Goals:**
- SSR optimization (client-only for MVP)
- Server-side loaders (all client-side for API key simplicity)
- Tests
- PWA or offline support

## Decisions

### 1. Client-side data fetching (no loaders)

React Router loaders run server-side by default. For client-only with API key:

```typescript
// Use useEffect + useState instead of loader
const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
```

**Rationale**: Avoids server proxy complexity. Loaders would require API key on server.

### 2. React state for reactivity

```typescript
const [tickers, setTickers] = useState<Ticker[]>([]);
const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
```

**Rationale**: Standard React pattern, familiar to most developers.

### 3. useEffect for poller lifecycle

```typescript
useEffect(() => {
  poller.start(tickers.map(t => t.symbol), setQuotes);
  return () => poller.stop();
}, [tickers]);
```

**Rationale**: Cleanup on unmount, restart on ticker changes.

### 4. File structure with typed routes

```
app/
├── routes/
│   └── _index.tsx      # Main page (root route)
├── components/
│   ├── ticker-list.tsx
│   ├── ticker-row.tsx
│   └── add-ticker.tsx
└── lib/
    └── wealth.ts       # Core service init
```

**Rationale**: Standard React Router v7 conventions with route types generated.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| API key in client | Document env setup |
| Not using loaders | Acceptable for client-only app, compare DX anyway |
| Route codegen setup | Follow official docs closely |

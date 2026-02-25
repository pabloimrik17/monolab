## 1. Scaffold & Setup

- [ ] 1.1 Run `pnpm create @tanstack/app` in apps/ directory, name it `wealth-tanstack`
- [ ] 1.2 Select TypeScript template
- [ ] 1.3 Update package.json name to `@m0n0lab/wealth-tanstack`
- [ ] 1.4 Add workspace dependency: `@m0n0lab/wealth-tracker-core`
- [ ] 1.5 Verify TanStack Query is included (add if not)
- [ ] 1.6 Add to pnpm-workspace.yaml if needed
- [ ] 1.7 Verify dev server runs (nx run @m0n0lab/wealth-tanstack:dev)

## 2. Environment Setup

- [ ] 2.1 Create `.env.example` with VITE_FINNHUB_API_KEY placeholder
- [ ] 2.2 Add `.env` to `.gitignore`
- [ ] 2.3 Document env setup in app README

## 3. Core Integration

- [ ] 3.1 Create `app/lib/wealth.ts` to initialize core services
- [ ] 3.2 Initialize TickerStore with localStorage
- [ ] 3.3 Initialize FinnhubClient with env API key
- [ ] 3.4 Note: Skip QuotePoller - will use TanStack Query instead

## 4. Query Setup

- [ ] 4.1 Set up QueryClient in root layout
- [ ] 4.2 Create `app/lib/queries.ts` with quotes query
- [ ] 4.3 Configure refetchInterval: 30_000 for auto-refresh

## 5. Components

- [ ] 5.1 Create `app/components/ticker-list.tsx` - main list with useQuery
- [ ] 5.2 Create `app/components/ticker-row.tsx` - single ticker display
- [ ] 5.3 Create `app/components/add-ticker.tsx` - input form
- [ ] 5.4 Create `app/components/query-status.tsx` - subtle refetch indicator

## 6. Main Page

- [ ] 6.1 Update `app/routes/index.tsx` with main layout
- [ ] 6.2 Wire up TickerStore state
- [ ] 6.3 Use useQuery for quotes with refetchInterval
- [ ] 6.4 Handle add/remove ticker actions (invalidate query on change)

## 7. Styling

- [ ] 7.1 Add basic CSS for list layout
- [ ] 7.2 Style positive/negative price changes (green/red)
- [ ] 7.3 Add loading and empty states

## 8. Verification

- [ ] 8.1 Test add ticker flow
- [ ] 8.2 Test remove ticker flow
- [ ] 8.3 Verify auto-refresh via Query works
- [ ] 8.4 Verify persistence across page reload
- [ ] 8.5 Run lint (nx run @m0n0lab/wealth-tanstack:lint)

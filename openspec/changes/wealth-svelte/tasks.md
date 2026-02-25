## 1. Scaffold & Setup

- [ ] 1.1 Run `pnpm create svelte` in apps/ directory, name it `wealth-svelte`
- [ ] 1.2 Select SvelteKit skeleton template with TypeScript
- [ ] 1.3 Update package.json name to `@m0n0lab/wealth-svelte`
- [ ] 1.4 Add workspace dependency: `@m0n0lab/wealth-tracker-core`
- [ ] 1.5 Add to pnpm-workspace.yaml if needed
- [ ] 1.6 Verify dev server runs (nx run @m0n0lab/wealth-svelte:dev)

## 2. Environment Setup

- [ ] 2.1 Create `.env.example` with VITE_FINNHUB_API_KEY placeholder
- [ ] 2.2 Add `.env` to `.gitignore`
- [ ] 2.3 Document env setup in app README

## 3. Core Integration

- [ ] 3.1 Create `src/lib/wealth.ts` to initialize core services
- [ ] 3.2 Create `src/lib/stores.ts` with tickers and quotes stores
- [ ] 3.3 Initialize TickerStore with localStorage
- [ ] 3.4 Initialize FinnhubClient with env API key
- [ ] 3.5 Initialize QuotePoller with 30s interval

## 4. Components

- [ ] 4.1 Create `src/components/TickerList.svelte` - main list container
- [ ] 4.2 Create `src/components/TickerRow.svelte` - single ticker display
- [ ] 4.3 Create `src/components/AddTicker.svelte` - input form
- [ ] 4.4 Create `src/components/RefreshIndicator.svelte` - last update time

## 5. Main Page

- [ ] 5.1 Update `src/routes/+page.svelte` with main layout
- [ ] 5.2 Add `export const ssr = false` to `+page.ts`
- [ ] 5.3 Wire up stores with reactive statements
- [ ] 5.4 Connect poller callbacks to store updates
- [ ] 5.5 Handle add/remove ticker actions

## 6. Styling

- [ ] 6.1 Add basic CSS for list layout
- [ ] 6.2 Style positive/negative price changes (green/red)
- [ ] 6.3 Add loading and empty states

## 7. Verification

- [ ] 7.1 Test add ticker flow
- [ ] 7.2 Test remove ticker flow
- [ ] 7.3 Verify auto-refresh works
- [ ] 7.4 Verify persistence across page reload
- [ ] 7.5 Run lint (nx run @m0n0lab/wealth-svelte:lint)

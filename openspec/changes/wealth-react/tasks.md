## 1. Scaffold & Setup

- [ ] 1.1 Run `pnpm create react-router` in apps/ directory, name it `wealth-react`
- [ ] 1.2 Select framework mode template with TypeScript
- [ ] 1.3 Update package.json name to `@m0n0lab/wealth-react`
- [ ] 1.4 Add workspace dependency: `@m0n0lab/wealth-tracker-core`
- [ ] 1.5 Enable typed routes in react-router.config.ts
- [ ] 1.6 Add to pnpm-workspace.yaml if needed
- [ ] 1.7 Verify dev server runs (nx run @m0n0lab/wealth-react:dev)

## 2. Environment Setup

- [ ] 2.1 Create `.env.example` with VITE_FINNHUB_API_KEY placeholder
- [ ] 2.2 Add `.env` to `.gitignore`
- [ ] 2.3 Document env setup in app README

## 3. Core Integration

- [ ] 3.1 Create `app/lib/wealth.ts` to initialize core services
- [ ] 3.2 Initialize TickerStore with localStorage
- [ ] 3.3 Initialize FinnhubClient with env API key
- [ ] 3.4 Initialize QuotePoller with 30s interval

## 4. Components

- [ ] 4.1 Create `app/components/ticker-list.tsx` - main list container
- [ ] 4.2 Create `app/components/ticker-row.tsx` - single ticker display
- [ ] 4.3 Create `app/components/add-ticker.tsx` - input form
- [ ] 4.4 Create `app/components/refresh-indicator.tsx` - last update time

## 5. Main Page

- [ ] 5.1 Update `app/routes/_index.tsx` with main layout
- [ ] 5.2 Set up useState for tickers and quotes
- [ ] 5.3 Wire up useEffect for poller lifecycle
- [ ] 5.4 Handle add/remove ticker actions

## 6. Styling

- [ ] 6.1 Add basic CSS for list layout
- [ ] 6.2 Style positive/negative price changes (green/red)
- [ ] 6.3 Add loading and empty states

## 7. Verification

- [ ] 7.1 Test add ticker flow
- [ ] 7.2 Test remove ticker flow
- [ ] 7.3 Verify auto-refresh works
- [ ] 7.4 Verify persistence across page reload
- [ ] 7.5 Run typecheck for typed routes
- [ ] 7.6 Run lint (nx run @m0n0lab/wealth-react:lint)

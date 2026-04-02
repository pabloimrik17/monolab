## 1. Scaffold & Setup

- [x] 1.1 Run `pnpm create react-router` in apps/ directory, name it `wealth-react`
- [x] 1.2 Select framework mode template with TypeScript
- [x] 1.3 Update package.json name to `@m0n0lab/wealth-react`
- [x] 1.4 Add workspace dependency: `@m0n0lab/wealth-tracker-core`
- [x] 1.5 Enable typed routes in react-router.config.ts
- [x] 1.6 Add to pnpm-workspace.yaml if needed
- [x] 1.7 Verify dev server runs (nx run @m0n0lab/wealth-react:dev)

## 2. Environment Setup

- [x] 2.1 Create `.env.example` with VITE_FINNHUB_API_KEY placeholder
- [x] 2.2 Add `.env` to `.gitignore`
- [x] 2.3 Document env setup in app README

## 3. Core Integration

- [x] 3.1 Create `app/lib/wealth.ts` to initialize core services
- [x] 3.2 Initialize TickerStore with localStorage
- [x] 3.3 Initialize FinnhubClient with env API key
- [x] 3.4 Initialize QuotePoller with 30s interval

## 4. Components

- [x] 4.1 Create `app/components/ticker-list.tsx` - main list container
- [x] 4.2 Create `app/components/ticker-row.tsx` - single ticker display
- [x] 4.3 Create `app/components/add-ticker.tsx` - input form
- [x] 4.4 Create `app/components/refresh-indicator.tsx` - last update time

## 5. Main Page

- [x] 5.1 Update `app/routes/_index.tsx` with main layout
- [x] 5.2 Set up useState for tickers and quotes
- [x] 5.3 Wire up useEffect for poller lifecycle
- [x] 5.4 Handle add/remove ticker actions

## 6. Styling

- [x] 6.1 Add basic CSS for list layout
- [x] 6.2 Style positive/negative price changes (green/red)
- [x] 6.3 Add loading and empty states

## 7. Verification

- [x] 7.1 Test add ticker flow
- [x] 7.2 Test remove ticker flow
- [x] 7.3 Verify auto-refresh works
- [x] 7.4 Verify persistence across page reload
- [x] 7.5 Run typecheck for typed routes
- [x] 7.6 Run lint (nx run @m0n0lab/wealth-react:lint)

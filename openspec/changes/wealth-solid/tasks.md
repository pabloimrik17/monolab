## 1. Scaffold & Setup

- [ ] 1.1 Run `pnpm create solid` in apps/ directory, name it `wealth-solid`
- [ ] 1.2 Select SolidStart template with TypeScript
- [ ] 1.3 Update package.json name to `@m0n0lab/wealth-solid`
- [ ] 1.4 Add workspace dependency: `@m0n0lab/wealth-tracker-core`
- [ ] 1.5 Configure `ssr: false` in app.config.ts
- [ ] 1.6 Add to pnpm-workspace.yaml if needed
- [ ] 1.7 Verify dev server runs (nx run @m0n0lab/wealth-solid:dev)

## 2. Environment Setup

- [ ] 2.1 Create `.env.example` with VITE_FINNHUB_API_KEY placeholder
- [ ] 2.2 Add `.env` to `.gitignore`
- [ ] 2.3 Document env setup in app README

## 3. Core Integration

- [ ] 3.1 Create `src/lib/wealth.ts` to initialize core services
- [ ] 3.2 Initialize TickerStore with localStorage
- [ ] 3.3 Initialize FinnhubClient with env API key
- [ ] 3.4 Initialize QuotePoller with 30s interval

## 4. Components

- [ ] 4.1 Create `src/components/ticker-list.tsx` - main list container
- [ ] 4.2 Create `src/components/ticker-row.tsx` - single ticker display
- [ ] 4.3 Create `src/components/add-ticker.tsx` - input form
- [ ] 4.4 Create `src/components/refresh-indicator.tsx` - last update time

## 5. Main Page

- [ ] 5.1 Update `src/routes/index.tsx` with main layout
- [ ] 5.2 Wire up signals for tickers and quotes
- [ ] 5.3 Connect poller callbacks to signal updates
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
- [ ] 7.5 Run lint (nx run @m0n0lab/wealth-solid:lint)

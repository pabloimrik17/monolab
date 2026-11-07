# Tasks

## 1. Shared errors and storage

- [x] 1.1 Add `MARKET_DATA_UNAVAILABLE` to `apiErrorCodeSchema` in `packages/investlab-core/src/data/shared/dto/api-error.dto.ts`; verify with `nx run @m0n0lab/investlab-core:test` (affects exports: run `nx run @m0n0lab/investlab-core:build:check-exports`)
- [x] 1.2 Add `MarketDataUnavailableError`, `QuotesErrorCode` and `QuotesRemoteError` in `packages/investlab-quotes/src/domain/error/` and export them from the root entry; verify with `nx run @m0n0lab/investlab-quotes:build:check-exports` (affects exports: attw)
- [x] 1.3 Make `KeyValueStorage.getObject(key, schema)` check the stored JSON with the caller's zod schema through `Result.fromThrowable(JSON.parse)`, and move the ticker storage repository and the client testing helpers to it; verify the "returns no value when the stored JSON does not match the schema" tests with `nx run @m0n0lab/investlab-platform:test` (affects exports: attw)

## 2. Quotes server path

- [x] 2.1 Rewrite `FinnhubClient` to return `ResultAsync`, with a private response schema, `FinnhubAuthError` short-circuiting the batches, and per-symbol upstream failures; verify with `nx run @m0n0lab/investlab-quotes:test:integration`
- [x] 2.2 Rewrite `QuoteFinnhubDatasource` (`NoQuoteDataError` as a value, failures passed through) and `QuoteRedisDatasource` (`ResultAsync` over ioredis, cache entry schema, unreadable entry as a miss); verify with `nx run @m0n0lab/investlab-quotes:test:integration`
- [x] 2.3 Rewrite `QuoteCachedRepository` and type the server `QuoteListUseCase` with `PersistenceError | MarketDataUnavailableError`; verify the market data unavailable, rate-limited, rejected key (no key in error or logs), unreadable data and cache-hit-during-outage cases in `quote-list.use-case.integration.ts` with `nx run @m0n0lab/investlab-quotes:test:integration`
- [x] 2.4 Add the `givenMarketDataFailing`, `givenMarketDataRateLimitReached`, `givenUnreadableMarketDataFor` and `givenAnUnreadableCachedQuoteFor` scenario helpers, and raise the quotes branch coverage floor to 75; verify with `nx run @m0n0lab/investlab-quotes:test:coverage`

## 3. Quotes client path

- [x] 3.1 Map `MARKET_DATA_UNAVAILABLE` to `MarketDataUnavailableError` in `QuoteApiRepository` through the API client's error map, and type the client use case with `QuotesRemoteError`; verify the "fails as market data unavailable" case with `nx run @m0n0lab/investlab-quotes:test:integration`

## 4. API

- [x] 4.1 Map `MARKET_DATA_UNAVAILABLE` to 503 in `error-http.mapper.ts`, with a generic message and the cause logged; verify the 503 route test with `nx run @m0n0lab/investlab-api:test:integration-platform`
- [x] 4.2 Replace the request validation middlewares with `@hono/zod-validator` and a hook that answers `RequestValidationError`, reject a non-JSON `Content-Type` and malformed JSON in `validateJsonBody` with the same single-issue 422 before `zod-validator` runs, and read `c.req.valid(...)` in the routes; verify the malformed body, malformed id and missing content type tests with `nx run @m0n0lab/investlab-api:test:integration-platform`

## 5. Web

- [x] 5.1 Map `MARKET_DATA_UNAVAILABLE` to 503 and "Quotes are unavailable right now. Please try again later." in `remote-error.mapper.ts`; verify with `nx run @m0n0lab/investlab:test` (mapper and `api.quotes` route tests)
- [x] 5.2 Make the route quote source return `ResultAsync` (unreachable route, error status, non-JSON and wrong-shape answers as `QuotesRequestError`) and have the poller match on it; verify with `nx run @m0n0lab/investlab:test` (`use-quote-polling.hook.legacy.test.ts`)

## 6. Integration checks

- [x] 6.1 Search the InvestLab packages and apps, tests excluded, for `throw` and `try`, and confirm only the allowed throws remain (Finnhub key guard, environment reads at boot, React Router server entry, loaders throwing `Response`)

## Workflow follow-up

- Archive this change in the same PR.

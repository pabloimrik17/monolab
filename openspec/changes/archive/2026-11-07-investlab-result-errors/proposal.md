# Proposal

## Why

In the PR #375 review the owner set a rule for InvestLab: failures are values, not exceptions, and data from outside the code is validated, never cast. The quotes path broke both halves. The Finnhub client and datasources threw, and the repository caught every throw into an empty result. So an invalid `FINNHUB_API_KEY` answered `GET /quotes` with 200 and an empty list, and a Finnhub outage looked the same as "no data for these symbols". Finnhub bodies, Redis cache entries and browser storage values were read with `as` casts.

## What Changes

- The Finnhub client, the Finnhub and Redis datasources and the cached quote repository return `Result`/`ResultAsync` instead of throwing. No `try`/`catch` is used as control flow.
- A key Finnhub rejects (401/403) fails the whole batch, and no later batch is sent. The error says "check FINNHUB_API_KEY" and never holds the key. The quote list fails with `PERSISTENCE_ERROR`, and the API answers 500 instead of 200 with an empty list.
- If Finnhub is unreachable or failing (network failure, non-2xx other than auth, 429, unreadable body) and nothing, cached or fetched, is left to answer, the quote list fails with the new `MARKET_DATA_UNAVAILABLE` code. The API answers 503 with a generic message. The web quotes route answers 503 with "Quotes are unavailable right now. Please try again later." Cached quotes are still returned. Symbols Finnhub has no data for still give an empty list.
- Each Finnhub body is checked against a schema private to the Finnhub client. A body it cannot read leaves that symbol out. Each Redis cache entry is checked against a schema private to the cache datasource. An unreadable or wrong-shape entry counts as a cache miss.
- The platform key-value storage's object read takes a zod schema. Missing, unparsable or wrong-shape data comes back as no value.
- The web quote poller's source returns a `ResultAsync`. If the route can't be reached, answers non-2xx, or sends something that isn't JSON or isn't a list of quotes, `onError` gets a fetch error.
- API request validation moves to `@hono/zod-validator`, and the 422 contract stays the same. Malformed JSON still answers 422. A body sent without a JSON content type answers 422 instead of being parsed. A repeated query key (`?symbols=A&symbols=B`) now answers 422 instead of using the first value.
- **BREAKING** (wire): `GET /quotes` can now answer 503 `MARKET_DATA_UNAVAILABLE` and 500 `PERSISTENCE_ERROR` where it used to answer 200 with an empty list. `apiErrorCodeSchema` gains `MARKET_DATA_UNAVAILABLE`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `quote-fetching`: single quote has the quote list's semantics (no data gives no quote, not an error) and is tested through `QuoteGetUseCase`; rejected key fails the batch and stops it; Finnhub bodies validated by a private schema; per-symbol failures leave the symbol out.
- `investlab-quote-cache`: cache entries validated on read; quote list fails with `MARKET_DATA_UNAVAILABLE` or `PERSISTENCE_ERROR` instead of answering empty.
- `investlab-http-api`: `MARKET_DATA_UNAVAILABLE` → 503 and rejected key → 500; a body without a JSON content type answers 422; the web quotes route answers 503 when market data is unavailable.
- `quote-polling`: an answer that isn't JSON or isn't a list of quotes is a fetch error.
- `investlab-platform`: the key-value storage's object read is checked against a schema.
- `clean-architecture-layout`: new InvestLab rules: failures are values, and external and persisted shapes are validated by their adapter.

## Impact

- Code: `packages/investlab-quotes` (new `domain/error/` with `MarketDataUnavailableError` and `QuotesRemoteError`, Finnhub client, datasources, cached and API repositories, testing helpers), `packages/investlab-platform` (key-value storage), `packages/investlab-core` (`apiErrorCodeSchema`), `apps/investlab-api` (error mapper, request validation middleware, routes), `apps/investlab` (remote error mapper, quote polling hook).
- Exports: `@m0n0lab/investlab-quotes` root entry adds `MarketDataUnavailableError`, `QuotesErrorCode` and `QuotesRemoteError`; both the `/server` and `/client` entries add `QuoteGetUseCase` and `QuoteGetError`, and `QUOTES.Get`. `QuoteRepository.getQuote` now resolves to `Quote | undefined`. `KeyValueStorage.getObject` gains a required `schema` parameter.
- Dependencies: `apps/investlab-api` adds `@hono/zod-validator`; `apps/investlab` adds `neverthrow`.

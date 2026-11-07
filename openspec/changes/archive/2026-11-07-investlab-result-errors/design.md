# Design

## Context

See proposal.md for the motivation. The Postgres repositories, use cases and the platform HTTP and API clients already returned `ResultAsync`. The quotes server path was the exception: the Finnhub client threw, `batchExecute` used `Promise.allSettled` and logged every rejection, and the cached repository wrapped whole `async` methods in `ResultAsync.fromPromise`. As a result, one rejected key, an outage, and an unknown symbol all came out as "no quote".

## Goals / Non-Goals

**Goals:**

- Each failure keeps its own type up to the point that decides what it means: the cached repository for the server, the error mappers for HTTP.
- Data from outside is checked by the adapter that reads it.

**Non-Goals:**

- Retries, backoff or a circuit breaker for Finnhub. A 429 counts as an upstream failure like any other.
- Caching "no data" answers or negative results.
- Changing the portfolio module, which already followed the rule.

## Decisions

### Errors as neverthrow values, layer by layer

- `FinnhubClient` returns `ResultAsync<FinnhubQuoteResponse, FinnhubQuoteError>`, where `FinnhubQuoteError = FinnhubAuthError | FinnhubResponseError | NetworkError`. `getQuotes` sends batches of 10 by folding `andThen` over them. Within a batch it uses `ResultAsync.combine` over settled entries, so a non-auth failure becomes data for its symbol (`FinnhubQuotes.failures`). A `FinnhubAuthError` is the only error that short-circuits, which is why no later batch is sent.
- `QuoteFinnhubDatasource` maps responses to quotes. An empty Finnhub quote becomes `NoQuoteDataError`, which is logged and left out. It passes upstream failures through as `FinnhubQuoteFetch.failures`.
- `QuoteRedisDatasource` wraps ioredis calls with `ResultAsync.fromPromise` into `PersistenceError`. It parses entries with `Result.fromThrowable(JSON.parse)` and a zod schema.
- `QuoteCachedRepository` turns cache errors into misses with `orElse`. It returns `MarketDataUnavailableError(failures)` only when nothing is left and some symbol failed upstream, and `PersistenceError(FinnhubAuthError)` for a rejected key. The write-through is fire-and-forget: it logs on `mapErr` and nothing waits for it.
- Web: `createRouteQuoteSource` returns `ResultAsync<Map, QuotesRequestError>`. It wraps `fetch` with `ResultAsync.fromThrowable` and `response.json()` with `fromPromise`, and parses the body with `safeParse`. The poller matches on the result instead of using `try`/`catch`.

Alternative considered: keep `throw` inside adapters and convert at the repository boundary. This was rejected because it is what hid the auth failure: a single `fromPromise` around the whole method collapses every cause into one.

### Allowed throws

Throws remain only for invariants and framework protocol. These are the `FinnhubClient` constructor guard on an empty key (wiring error), the environment readers (`readEnv`, the `PORT` parser, `drizzle.config.ts`) failing fast at boot, the React Router server entry's stream boilerplate, and loaders that `throw new Response(...)`, as React Router expects. Everything else returns a `Result`.

### Error → status choices

- `MARKET_DATA_UNAVAILABLE` → 503. The failure is upstream and transient, so a client may retry later. It is a new domain error of the quotes module (`domain/error/market-data-unavailable.error.ts`). The `apiErrorCodeSchema` and the API's `STATUS_BY_CODE` map list it, and the client `QuoteApiRepository` rebuilds it from the code through the API client's error map (`QuotesRemoteError = RemotePortError<MarketDataUnavailableError>`). The web's `remoteErrorStatus` maps it to 503 with its own user message.
- Rejected key → `PERSISTENCE_ERROR` → 500. It is a configuration fault, retrying won't help, and the user can't fix it. A generic 500 keeps the cause out of the response, and `errorJson` logs it for every 5xx. That log is where "check FINNHUB_API_KEY" shows up. The key itself never appears, because the request URL is never part of an error (the key is URL-encoded into the query and `NetworkError` wraps only the fetch cause).
- `NoQuoteDataError` from a single-symbol read also maps to `PERSISTENCE_ERROR`. A batch read never surfaces it, because unknown symbols are just left out.

### Request validation with `@hono/zod-validator`

The hand-written `validateJsonBody` / `validateQuery` / `validateId` middlewares used `try`/`catch` and `throw`. They are now `zValidator` with a hook that returns `errorJson(RequestValidationError.fromZod(...))`, and handlers read `c.req.valid(...)`. `validateJsonBody` wraps the validator: a non-JSON `Content-Type` answers 422 with a single issue of empty path ("Body must be JSON (Content-Type: application/json)"), and it parses the body itself as a `ResultAsync`, answering 422 "Body must be valid JSON" for malformed JSON before `zod-validator` runs. `handleError` no longer maps Hono's `HTTPException`. Hono would otherwise skip parsing and validate `{}`, so no use case runs on a mislabelled body, `PUT` included.

### Schemas private to their adapter

The Finnhub response schema lives unexported in `finnhub.client.ts` and keeps only `c`, `d` and `dp`. The cache entry schema lives in `quote-redis.datasource.ts` and turns `updatedAt` back into a `Date`. The followed tickers schema lives in `ticker-storage.repository.ts`. `KeyValueStorage.getObject(key, schema)` takes the caller's schema, so the platform never knows the shape.

## Risks / Trade-offs

- [A rejected key fails the whole list even when some symbols are cached] → Intended. Answering the cached subset would hide a revoked key until the cache expires.
- [`MARKET_DATA_UNAVAILABLE` only fires when nothing is left. If some symbols fail upstream and others succeed, the answer is 200 with the failed symbols left out and only a log line] → Accepted: partial quotes are more useful to the poller than an error. The failures are logged per symbol.
- [The poller treats any non-success status alike] → Unchanged. Its `onError` gets `Quotes request failed: HTTP 503`, not the route's message, so the poller can't tell the user that market data is unavailable as opposed to some other failure.

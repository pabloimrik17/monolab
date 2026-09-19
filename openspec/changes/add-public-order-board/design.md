## Context

See `proposal.md` — Why. Design-relevant current state, verified in code:

- `Order` owns one status; `OrderItem` has none (ADR 0001). `orders.updated_at` is refreshed on every status transition, so it is exactly "time of last status change" — the input retention needs.
- `PgOrderRepository.findBySessionId` already returns orders sorted by `createdAt` with their items attached. No repository or schema work is needed.
- `GetSessionByCodeUseCase` rejects closed sessions with `SessionClosedError` → 409. Every code-scoped public endpoint inherits the Q37/Q43 state machine for free.
- `apps/qup-api/src/serializers/dto-serializers.ts` is the single serialization seam; `event.routes.ts` is the only place that serializes an `Order` into an SSE frame.
- `apps/qup-web/src/server/data.ts` holds unauthenticated reads; `mutations.ts` holds PIN-forwarding writes. Neither checks the admin cookie — SolidStart server functions are reachable by any client that can reach the web app, so `mutations.ts` is already an open proxy to host-only endpoints. This change has to close that to avoid re-opening the hole it is meant to shut.
- SSE runs on an in-memory `EventEmitter` with no replay (ADR 0003).
- Browsers connect to SSE directly against `qup-api` (`sse-url.ts`), bypassing the SolidStart BFF. Anything on a stream is public regardless of which screen consumes it.

## Goals / Non-Goals

**Goals:**

- One projection type is the only order shape any unauthenticated caller can obtain, enforced at the serializer seam rather than per route.
- Retention is a property of the snapshot, not of storage or of the client.
- The admin experience is unchanged in what it shows, even though its data path changes.
- No new persistence, no item-level status, no new identifier.

**Non-Goals:**

- Multi-replica live updates (ADR 0003).
- Automated tests (Q38/Q44).
- Reworking the guest ordering flow or the admin queue UI.
- Real authentication for guests. The session code and guest name stay a convenience trust model.

## Decisions

### Public projection lives in `qup-shared`, serialized by a dedicated `qup-api` serializer

`PublicOrderBoardDto` / `PublicOrderSummaryDto` go in `packages/qup-shared/src/dtos.ts` next to the existing DTOs, with a `toPublicOrderSummary` in a new `qup-api` serializer module that never imports `toOrderDto`.

*Why:* the leak risk is "someone returns the wrong shape", so the defence is one narrow function with no path to the wide one. Sharing the type also lets the board ViewModel and the API agree without a second declaration.

*Alternatives:* filter in the web layer (rejected — the API is reachable directly, so the browser is not a boundary); add an `?public=true` mode to existing endpoints (rejected — one handler returning two shapes is exactly the mistake that produced today's exposure).

### Retention computed in a use case, from `updatedAt`

A `GetPublicOrderBoardUseCase` in `qup-domain` loads the session by code and its orders, then drops orders whose deadline has passed and stamps `visibleUntil` on those that have one: `DONE` → `updatedAt + 5min`, `CANCELLED` → `updatedAt + 2min`, otherwise null.

*Why:* Q24 makes the server authoritative. Putting it in a use case rather than the route keeps the rule testable and out of HTTP concerns, and matches the existing use-case-per-read pattern.

*Alternatives:* a persisted `visible_until` column (rejected — derivable, and a write on every transition for no gain); client-side filtering only (rejected — the wire would still carry finished orders indefinitely).

### A separate, payload-free board stream

`GET /events/sessions/:code/board` maps `order:created`, `order:status`, `order:cancelled` onto a single `board:changed` name and forwards `session:closed`, always with empty data.

*Why:* a stream that never constructs a payload cannot leak one. It also decouples the board's coarse "something changed" contract from the existing per-order stream, so the guest status screen keeps working unchanged in shape.

*Alternative:* reuse the sanitized `/events/sessions/:code` for the board (rejected — the board would have to know three event names to express one meaning, and every future event added for another consumer becomes a board concern).

### The existing session stream is sanitized in place, and clients stop patching from payloads

`order:created` stops carrying the `Order`; `event.routes.ts` no longer imports `toOrderDto`. `OrderQueueViewModel` currently builds its list from event payloads — it switches to refetching the protected snapshot on any signal, reusing the same coalescing helper as the board.

*Why:* Q31/Q36. It also removes the only place where the domain entity crosses into a transport frame.

*Trade-off:* the admin queue does one HTTP round trip per change instead of applying a payload. At home-gathering volume this is irrelevant, and it removes a class of "client state drifted from server state" bug.

### Server functions split by trust level

`server/data.ts` splits into public reads (board snapshot, per-guest orders, menu, session by code) and host reads (active sessions, session by id, complete session orders). Every host read, and every function in `mutations.ts` that attaches the PIN, calls `isAuthenticated()` first and refuses otherwise.

*Why:* the API-side `adminOnly()` middleware is worthless if a public server function will attach the PIN on anyone's behalf. Protecting the `/admin/*` routes in `middleware.ts` does not protect the server functions, which have their own endpoints.

*Note:* this hardens `mutations.ts`, which is currently unguarded. That is in scope here because moving reads behind `adminOnly()` without it would just relocate the exposure.

### Refetch coalescing as one shared helper

A single in-flight request, at most one queued trailing refetch, and a monotonically increasing request id so late responses are discarded. `OrderStatusViewModel` already implements the last part (`latestRefresh`); the helper generalises it and is used by the board, the status screen, and the admin queue.

*Why:* Q42, and three ViewModels now need identical behaviour.

### Expiry driven by one scheduled timer, not a ticker

After each snapshot the board schedules a single timer to the nearest future `visibleUntil`; when it fires the board drops expired cards and reschedules. No periodic polling.

*Why:* a shared tablet runs for hours; a 1s interval that re-renders a column list is needless work and fights the reduced-motion requirement.

*Clock skew:* `visibleUntil` is absolute and compared against the client clock, so a badly skewed tablet drops cards early or late. Self-correcting — the server omits expired orders from every snapshot, and every signal triggers a refetch. Acceptable for this deployment; not worth a server-time handshake.

### QR rendered client-side as inline SVG via `uqr`

`uqr` is ESM-only, dependency-free, and returns SVG markup, which suits this ESM-only workspace and a wide-screen-only element that does not need to exist during SSR. Pinned to an exact version, matching how `hono`, `vinxi`, and `@solidjs/router` are pinned here.

*Alternatives:* `qrcode` (heavier, canvas/Node-oriented); hand-rolling QR encoding (not worth it).

*This is the one new runtime dependency in the change* — see Open Questions.

### `GET /orders?sessionId=&guest=` is removed

It is public, returns complete `OrderDto`s, and nothing in `qup-web` calls it; `GET /sessions/code/:code/orders?guest=` replaces it with the reduced projection.

*Why:* leaving a redundant leaky endpoint behind defeats the point of the change.

### The board snapshot arrives pre-sorted; the client never re-sorts

`GetPublicOrderBoardUseCase` returns `orders` already in board order — `PENDING` oldest first, then `PREPARING` oldest first, then `DONE` newest first by last status change — and the route renders each section in the array order it received.

*Why:* the projection forbids every timestamp but `visibleUntil`, while the layout requires `Pending`/`Preparing` oldest first and `Recently served` newest first. Without this, the two requirements contradict each other: the client is asked to sort on data it is not allowed to see. Sorting server-side satisfies both and keeps the ordering rule next to the retention rule that already lives in the use case.

*Alternatives:* expose `createdAt`/`updatedAt` on the projection (rejected — widens the public surface for a presentation concern); sort `Recently served` by `visibleUntil` descending (equivalent while the window is a constant offset, but it silently breaks if the two retention windows ever differ per status, and it does not exist before block 3).

### Server functions return discriminated unions, not neverthrow `Result`

The inherited `qup-web` requirement said server functions "return typed results using neverthrow `Result`", with a scenario demanding `Err<ApiErrorDto>` rather than a throw. Nothing in the codebase does this: every function in `server/data.ts` throws a plain `Error`, and `neverthrow` is not even a dependency of `apps/qup-web`. The `MODIFIED` delta here restates that requirement, so this change would have republished a claim that was never true.

Corrected to describe what the board actually needs and what the platform allows: a server function whose caller must distinguish outcomes (the board snapshot must tell 404 from 409) returns a plain serializable discriminated union; one whose caller only needs success or failure may throw. A class instance does not survive the SolidStart server-function serialization boundary, so `Result` was never available here regardless.

*Not done:* converting the existing throwing functions to typed outcomes. That is a `qup-web`-wide refactor with no task in this change, and none of its callers currently need the distinction.

## Risks / Trade-offs

- **The capabilities this change modifies are not in `openspec/specs/` yet** — they live in the unarchived `qup` change (110/113 tasks done) and `fix-qup-web-wiring` (complete). If those archive after this change, the `MODIFIED` deltas here have no base to apply to. → Archive `qup` and `fix-qup-web-wiring` before archiving this change, or re-base these deltas onto whatever lands in `openspec/specs/`.
- **`OrderCreatedEvent` changes shape in a published package** (`@m0n0lab/qup-shared`) → coordinate the API and web deploys together; there is no external consumer today, and `attw --pack` plus `nx run-many -t typecheck` catch every internal break at build time.
- **Admin dashboard fan-out becomes authenticated** — `DashboardViewModel` fetches orders per active session to compute its summary, so every one of those now needs the admin path. → Keep the summary logic as-is and only swap the data function; a missed one fails loudly with 401 rather than silently.
- **Sanitizing SSE removes the admin queue's optimistic path** → the queue already patches locally on its own mutations; the refetch only has to cover other people's changes.
- **Knip has a 40-issue budget (`knip --max-issues 40`)** and this adds exported types and a new dependency → keep every new export consumed by a real caller in the same slice that introduces it.
- **Wake lock is released by the browser on tab hide** and is not re-acquired automatically → re-request on `visibilitychange` when the board becomes visible again.
- **Single API process** (ADR 0003) → documented, not mitigated. Snapshots stay correct; only live invalidation depends on it.
- **`docs/` is not markdownlint-ignored** (unlike `openspec/`), and `CONTEXT.md` at the repo root is not in `.markdownlintignore` → these new files must pass `lint:markdownlint` or be added to the ignore list.

## Migration Plan

1. Ship `qup-shared`, `qup-domain`, `qup-api`, and `qup-web` together — the public API contract change is breaking and the web app is its only client.
2. No database migration; no data backfill. Retention is computed, so the change is stateless and instantly reversible.
3. Rollback: revert the commits and redeploy. Stored orders are untouched throughout, so nothing needs repair.
4. Env: no new variables. `API_ADMIN_PIN` and `QUP_AUTH_SECRET` remain required by the web app, which now genuinely enforces the cookie they back.

## Open Questions

- **QR library**: `uqr` is the recommendation above and the tasks assume it. If a different library is preferred, only the QR component changes — no spec, endpoint, or task-structure impact.

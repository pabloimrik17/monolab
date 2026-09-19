## Why

Guests currently have no shared way to see how the session is progressing. `/session/:code/status` shows every order when `?guest=` is absent, but it filters client-side, reuses the full `OrderDto`, and is not designed for a shared display. At the same time the public API surface is wider than intended: `GET /sessions?status=OPEN` lists active session codes to anyone, `GET /sessions/:id/orders` returns complete orders including notes and customizations, and the session SSE stream emits whole `OrderDto` payloads on `order:created`.

A read-only public order board on a shared tablet next to the host answers "is my drink ready?" without anyone asking, and forces the public data boundary to be defined explicitly instead of inherited from the admin contract.

## What Changes

- Add a read-only board at `/session/:code/board`, reachable with the session code and no host PIN, plus a `View board` link from the session page.
- Add a dedicated public projection (`PublicOrderBoardDto`) exposing only session name/code, order UUID (as a non-displayed render key), guest name, status, at most 3 product lines ordered by product name, a hidden-item count, and `visibleUntil`. Notes, customizations, session id, and unrelated timestamps never reach it.
- Add `GET /sessions/code/:code/board` (snapshot) and `GET /events/sessions/:code/board` (payload-free `board:changed` / `session:closed` signals). The client refetches the snapshot on every signal, coalescing bursts.
- Apply server-side retention: `DONE` visible 5 minutes, `CANCELLED` 2 minutes, computed from `updatedAt`. Orders are never deleted.
- Add board presentation: `Pending` / `Preparing` / `Recently served` columns (always rendered, stacked on mobile), a temporary red cancelled strip, session header with code and wide-screen join QR, fullscreen control, screen wake lock, reduced-motion-aware transitions, `Reconnecting…` on connection loss, and frozen `Session ended` state on closure.
- **BREAKING** `GET /sessions?status=OPEN` becomes host-only. Listing active sessions and their codes is no longer public.
- **BREAKING** `GET /sessions/:id/orders` becomes host-only. Complete order data is no longer publicly readable.
- **BREAKING** `GET /events/sessions/:code` stops emitting order payloads; `order:created` carries no `order` object. Admin live updates switch to sanitized invalidation plus an authenticated refetch.
- Replace the guest status screen's client-side name filtering with a reduced server-side public read (`GET /sessions/code/:code/orders?guest=`). The guest name stays a filter, explicitly not authentication.
- Gate the SolidStart server functions that now carry the admin PIN behind the existing `qup_admin` cookie check, so they are not an open proxy to host-only endpoints.
- Add no automated test files (Q38/Q44). Validation is the existing Nx `typecheck`, `build`, and `test:unit` targets plus a manual walkthrough.

## Capabilities

### New Capabilities

- `qup-public-order-board`: the public board — its projection contract, snapshot and sanitized-event endpoints, retention window, route, layout, and shared-display behavior (wake lock, fullscreen, QR, motion, reconnect, closure freeze).

### Modified Capabilities

- `qup-api`: active-session listing and complete session-order reads become host-only; a reduced public per-guest order read is added; HTTP status semantics for the public code-scoped routes are pinned (422 malformed / 404 unknown / 409 closed).
- `qup-realtime-events`: the public session SSE stream is sanitized — no order payloads — and a board-scoped invalidation stream is added; clients refetch instead of patching from events.
- `qup-web`: adds the board route and its view model; the guest status screen consumes the server-filtered public read; admin views refetch protected snapshots through authenticated server functions instead of reading order payloads off SSE.
- `qup-admin-auth`: server functions that attach the admin PIN to host-only API calls SHALL verify the caller's admin session first.

Note on sequencing: `qup-api`, `qup-realtime-events`, `qup-web`, and `qup-admin-auth` currently exist only as deltas inside the unarchived `qup` change, not yet under `openspec/specs/`. These `MODIFIED` deltas assume `qup` (and `fix-qup-web-wiring`) archive first; if they do not, this change's deltas must be re-based onto whatever lands in `openspec/specs/`.

## Impact

- `packages/qup-shared`: new public DTOs and board event names in `dtos.ts` / `events.ts`, re-exported from `index.ts`. Published package — export surface changes require `attw --pack` validation.
- `packages/qup-domain`: new `GetPublicOrderBoardUseCase` and `GetGuestOrdersUseCase` (or equivalent) plus tokens and `domainModule` bindings. No entity, value-object, or schema change — `Order` keeps one status (ADR 0001), `OrderItem` gains nothing.
- `packages/qup-data`: unchanged. `findBySessionId` already returns orders ordered by `createdAt` with items attached.
- `apps/qup-api`: new public projection serializer; `session.routes.ts` gains `/code/:code/board` and `/code/:code/orders` and puts `adminOnly()` on `GET /` and `GET /:id/orders`; `event.routes.ts` gains the board stream and stops serializing `Order` into `order:created`.
- `apps/qup-web`: new `routes/session/[code]/board.tsx`, `view-models/order-board.viewmodel.ts`, board components, and a QR helper; `server/data.ts` splits into public reads and admin-authenticated reads; `order-status.viewmodel.ts` and `order-queue.viewmodel.ts` change their data sources; `sse-url.ts` gains a board URL builder.
- New runtime dependency for QR rendering in `qup-web` (pinned exact, per workspace convention).
- Deployment: live updates remain single-API-process only (ADR 0003); this is now an explicit, documented constraint rather than an accident.
- `CONTEXT.md` and `docs/` are new untracked files that ship with this change; `docs/` is not markdownlint-ignored, unlike `openspec/`.

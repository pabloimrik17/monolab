## 0. Orchestration

Main session = orchestrator. It does not implement slices; it dispatches teammate blocks, merges in stack order, and owns the final validation gate.

**Slicing rule:** every block below is a vertical slice — shared DTO → domain → API → web → observable behavior. No block is "all the API work" or "all the UI work". Each block leaves the app runnable and manually checkable on its own.

**Waves:**

- Wave 1 (parallel): block 1 `boundary`, block 2 `board-core`
- Wave 2 (parallel, after wave 1): block 3 `retention`, block 4 `board-live`
- Wave 3 (after wave 2): block 5 `sse-sanitize`, then block 6 `display` (parallel-safe with 5 except both touch the board route)
- Wave 4: block 7, orchestrator only

**Known file contention** (orchestrator merges in stack order to avoid conflicts):

- `apps/qup-api/src/routes/session.routes.ts` — blocks 1 and 2
- `apps/qup-web/src/view-models/order-board.viewmodel.ts` — blocks 2, 3, 4
- `apps/qup-web/src/routes/session/[code]/board.tsx` — blocks 2, 3, 6
- `apps/qup-web/src/view-models/order-status.viewmodel.ts` — blocks 1 and 5

**The stack merges atomically.** `design.md` Migration Plan step 1 ships `qup-shared`, `qup-domain`, `qup-api`, and `qup-web` together, so the stack lands in one all-or-nothing merge (`gh stack merge <top> --yes`) rather than layer by layer. This matters: block 1 puts `adminOnly()` on `GET /sessions/:id/orders`, which the guest status screen still consumes until block 5 moves it to the public per-guest read. From layer 1 to layer 4 that screen returns 401 by construction. Reviewers of those layers see it; `develop` never does. Landing layer 1 on its own would ship the regression.

Block 5 owns the repair (5.3) and SHALL add the public per-guest server function in `qup-web` alongside the ViewModel change — block 1 cannot add it, because nothing in that slice consumes it and knip would flag it unused. The public order card that 5.3 needs is block 2's; 5.3 reuses it rather than adding a second one.

**Delivery: `gh stack`, 6 layers.** Rationale: ~25 files across 4 packages with 3 breaking public-API changes — too much for one reviewable PR, and the slices have a clean linear dependency order, so independent PRs would conflict. One PR per block, stacked bottom-up in the order below. Parallel teammates still work concurrently; the orchestrator lands their branches into the stack in dependency order. Stack order = block order: `boundary` → `board-core` → `retention` → `board-live` → `sse-sanitize` → `display`.

- [x] 0.1 Create the 6-layer stack skeleton with `gh-stack` off `develop` and verify `gh stack view` lists all layers in the order above
- [x] 0.2 Dispatch wave 1 teammates and verify each reports its block's manual check passing before wave 2 starts

## 1. Block `boundary` — close the public data boundary

`[model: opus-5 · effort: medium · wave 1 · stack layer 1]`

Slice: no unauthenticated caller can list session codes or read complete orders, and guests get a reduced per-guest read instead. Independent of the board; ships and is verifiable alone.

- [x] 1.1 Add `PublicOrderSummaryDto` to `packages/qup-shared/src/dtos.ts` and export from `index.ts`; verify `pnpm nx run @m0n0lab/qup-shared:build:check-exports` passes (**export surface change — attw required**)
- [x] 1.2 Add a public-projection serializer in `apps/qup-api/src/serializers/` that maps `Order` → `PublicOrderSummaryDto` (max 3 item lines, `hiddenItemCount`, no notes/customizations/menuItemId/sessionId) and never imports `toOrderDto`; verify by reading the module that it has no path to the complete DTO
- [x] 1.3 Add `GET /sessions/code/:code/orders?guest=` returning the reduced projection filtered server-side, 422 when `guest` is absent; verify `curl` for a session with two guests returns only the requested guest's orders and no notes
- [x] 1.4 Remove `GET /orders?sessionId=&guest=`; verify no caller remains (`grep` across `apps/` and `packages/`) and `pnpm nx run-many -t typecheck` passes
- [x] 1.5 Apply `adminOnly()` to `GET /sessions?status=OPEN`, `GET /sessions/:id`, `GET /sessions/:id/orders`; verify each returns 401 without `X-Admin-Pin` and 200 with it
- [x] 1.6 Split `apps/qup-web/src/server/data.ts` into public reads and host reads, guarding every host read with `isAuthenticated()`; verify an unauthenticated invocation of a host read is refused and sends no PIN to the API
- [x] 1.7 Guard every PIN-forwarding function in `apps/qup-web/src/server/mutations.ts` with `isAuthenticated()` (closes a pre-existing open proxy); verify an unauthenticated call is refused while the admin UI still performs all its actions
- [x] 1.8 Point `DashboardViewModel` and `OrderQueueViewModel` at the host reads; verify `/admin/dashboard` and `/admin/session/:id` still render sessions, codes, and complete orders after login

## 2. Block `board-core` — board walking skeleton

`[model: opus-5 · effort: high · wave 1 · stack layer 2]`

Slice: a guest with only the session code opens `/session/:code/board` and sees real orders in three columns. No retention, no live updates yet.

- [x] 2.1 Add `PublicOrderBoardDto` (session name/code + order summaries) to `packages/qup-shared/src/dtos.ts` and export it; verify `pnpm nx run @m0n0lab/qup-shared:build:check-exports` passes (**export surface change — attw required**)
- [x] 2.2 Add `GetPublicOrderBoardUseCase` to `qup-domain` (resolve session by code, load its orders), register its token and `domainModule` binding, export from `index.ts`; verify `pnpm nx run @m0n0lab/qup-domain:typecheck` passes
- [x] 2.3 Add `GET /sessions/code/:code/board` returning the snapshot with no PIN; verify `curl` returns 200 for an open session, 422 for a malformed code, 404 for an unknown code, 409 for a closed session
- [x] 2.4 Add a public board-snapshot server function in `qup-web` (no admin session required); verify it resolves for a caller with no admin cookie
- [x] 2.5 Add `OrderBoardViewModel` (`@injectable()`, extends `BaseViewModel`) with snapshot load plus `Session not found` / `Session ended` / `No orders yet` states, register token and `webModule` binding; verify each state renders for the matching session code
- [x] 2.6 Add `/session/:code/board` route rendering `Pending` / `Preparing` / `Recently served` — always all three, columns on wide screens, stacked on narrow — sorted oldest-first, oldest-first, newest-first, one card per order, with `+N more` after 3 item lines; verify in a browser at wide and narrow widths against a session holding a 5-line order
- [x] 2.7 Add the `View board` link on `/session/:code`; verify it opens the board without a PIN
- [x] 2.8 Verify the whole slice: `pnpm nx run-many -t typecheck build test:unit` passes and the board shows live-correct data on manual refresh

## 3. Block `retention` — visibility window and cancelled strip

`[model: opus-5 · effort: medium · wave 2 · stack layer 3]`

Slice: finished orders age off the board on their own, without being deleted.

Handoff from block 2: `OrderBoardViewModel.hasVisibleOrders()` decides the `No orders yet` state from the three main sections only. The cancelled strip must be added to that predicate in 3.5, or a session holding only cancelled orders shows `No orders yet` above a populated red strip. Block 2 also returns cancelled orders in the snapshot already, ordered last, newest-change-first — 3.5 needs no use-case ordering change.

- [ ] 3.1 Add `visibleUntil` to `PublicOrderSummaryDto`; verify `pnpm nx run @m0n0lab/qup-shared:build:check-exports` passes (**export surface change — attw required**)
- [ ] 3.2 Compute retention in `GetPublicOrderBoardUseCase` — `DONE` = `updatedAt + 5min`, `CANCELLED` = `updatedAt + 2min`, otherwise null — and omit already-expired orders from the snapshot; verify a just-served order appears with a deadline and a 6-minute-old served order does not
- [ ] 3.3 Confirm retention never deletes: after an order ages off the board, verify the host's `GET /sessions/:id/orders` still returns it
- [ ] 3.4 Add the single-timer expiry in `OrderBoardViewModel` — schedule to the nearest future `visibleUntil`, drop expired cards, reschedule, clear on unmount, no periodic ticker; verify a card disappears with no refresh and no interval is left running
- [ ] 3.5 Add the red cancelled strip below the three sections, holding only cancelled orders within their window; verify a cancelled order appears in the strip, in none of the three columns, and leaves after 2 minutes

## 4. Block `board-live` — board signal stream

`[model: opus-5 · effort: high · wave 2 · stack layer 4]`

Slice: the board updates by itself, survives a dropped connection, and freezes when the session closes.

- [ ] 4.1 Add a shared refetch-coalescing helper in `qup-web` (one request in flight, at most one trailing refetch, stale responses discarded); verify 10 rapid triggers during one in-flight request produce exactly one extra request
- [ ] 4.2 Add `GET /events/sessions/:code/board` emitting payload-free `board:changed` (on create/status/cancel) and `session:closed`, with 422/404/409 code semantics and subscription release on disconnect; verify with `curl -N` that frames carry no order data and that listeners are released on client close
- [ ] 4.3 Add a board SSE URL builder alongside `sse-url.ts`; verify the board connects to the correct origin from a phone on the LAN
- [ ] 4.4 Subscribe `OrderBoardViewModel` to the stream and refetch through the coalescing helper; verify placing an order on a phone updates the board with no reload
- [ ] 4.5 Add `Reconnecting…` on connection loss while retaining the last known board; verify stopping the API leaves the cards on screen with the notice shown
- [ ] 4.6 Add closure freeze on `session:closed` — keep current cards, show `Session ended`, stop refetching and reconnecting; verify closing the session freezes an open board and that a reload then shows only `Session ended`

## 5. Block `sse-sanitize` — strip payloads from the public stream

`[model: opus-5 · effort: high · wave 3 · stack layer 5]`

Slice: the existing session stream stops carrying order data, and both of its consumers move to refetch. Must land with its consumers in the same slice or the admin queue breaks.

- [ ] 5.1 Change `OrderCreatedEvent` in `packages/qup-shared/src/events.ts` to carry no order object; verify `pnpm nx run-many -t typecheck` names every affected consumer (**export surface change — attw required**)
- [ ] 5.2 Remove `Order`/`toOrderDto` serialization from `apps/qup-api/src/routes/event.routes.ts`; verify `curl -N /events/sessions/:code` over a full order lifecycle emits no notes, customizations, or complete DTO
- [ ] 5.3 Move `OrderStatusViewModel` to the public per-guest read from block 1 and drop its client-side name filtering; verify `/session/:code/status?guest=Ana` shows only Ana's orders and the payload contains no other guest
- [ ] 5.4 Move `OrderQueueViewModel` from event-payload patching to refetching the host snapshot via the coalescing helper; verify a guest order placed elsewhere appears in the admin queue with notes and customizations intact, and that host status/cancel buttons still work
- [ ] 5.5 Verify the boundary holds end to end: with no PIN, no reachable endpoint or stream returns notes, customizations, or an active session code

## 6. Block `display` — shared-display affordances

`[model: sonnet-5 · effort: medium · wave 3 · stack layer 6]`

Slice: the board becomes usable as a room display. Self-contained in the board route and its components.

- [ ] 6.1 Add `uqr` pinned to an exact version in `apps/qup-web/package.json`; verify `pnpm install` succeeds and `pnpm nx run @m0n0lab/qup-web:build` passes
- [ ] 6.2 Add the header — session name, code, and a QR to `/session/:code` rendered inline as SVG on wide screens only; verify the QR is absent at narrow widths and that scanning it opens the join page
- [ ] 6.3 Add the `Enter fullscreen` control, hidden while fullscreen is active; verify toggling it on a tablet
- [ ] 6.4 Request a screen wake lock when supported, re-request on `visibilitychange`, release on unmount, silent fallback otherwise; verify no error in a browser without the API and that the screen stays awake in one that has it
- [ ] 6.5 Add brief column transitions and new-order highlighting, suppressed under `prefers-reduced-motion`, with no sound; verify both motion settings
- [ ] 6.6 Raise the board's type scale and contrast over the guest screens while keeping the light palette; verify legibility from across a room on the target tablet

## 7. Validation gate (orchestrator)

`[model: opus-5 · effort: medium · wave 4]`

No test files are added (Q38/Q44) — this gate is the safety net.

- [ ] 7.1 Run `pnpm nx run-many -t typecheck build test:unit` across the workspace and verify it passes clean
- [ ] 7.2 Run `pnpm nx run @m0n0lab/qup-shared:build:check-exports` and verify attw reports no issue for the changed export surface
- [ ] 7.3 Run the lint suite and verify knip stays within its 40-issue budget with no unused new export
- [ ] 7.4 Verify `CONTEXT.md` and `docs/**` pass `lint:markdownlint` (unlike `openspec/`, `docs/` is not ignored) or are added to `.markdownlintignore`
- [ ] 7.5 Manual walkthrough on one API process: join → order → host advances to `PREPARING` → `DONE` → card moves to `Recently served` → ages off after 5 min; cancel → red strip → gone after 2 min; kill the API → `Reconnecting…`; close the session → freeze + `Session ended`; reload → `Session ended` only
- [ ] 7.6 Verify every acceptance criterion in `docs/public-order-board-decisions.md` is met, and reconcile that document with anything the implementation changed
- [ ] 7.7 Confirm the archive order: `qup` and `fix-qup-web-wiring` archive before this change, or re-base these `MODIFIED` deltas onto whatever lands in `openspec/specs/`

# Public Order Board — Decision Log

Status: design complete; awaiting explicit shared-understanding confirmation before implementation. Questions Q1–Q44 settled. Q38 explicitly adds no automated tests.

## Goal

Add a read-only public board at `/session/:code/board` that shows every order's current status. It is primarily displayed on a shared tablet or computer near the host, remains usable on personal devices, and requires the session code but no host PIN.

Domain language lives in [`../CONTEXT.md`](../CONTEXT.md). Architectural decisions live in [`adr/0011-track-status-per-order.md`](adr/0011-track-status-per-order.md), [`adr/0012-use-a-dedicated-public-order-projection.md`](adr/0012-use-a-dedicated-public-order-projection.md), and [`adr/0013-run-live-updates-on-one-api-instance.md`](adr/0013-run-live-updates-on-one-api-instance.md).

## Settled questions

### Audience, access, and lifecycle

**Q1 — Primary device**  
Question: shared fixed display, personal mobile, or both?  
Decision: both; prioritize a shared tablet/computer display while keeping the board responsive for personal devices.

**Q2 — Meaning of public**  
Question: code as selector, protected secret, or host-authenticated display?  
Decision: guests view the board with the session code and no host PIN. The host normally puts it on the shared display.

**Q3 — Meaning of `DONE`**  
Question: ready, served, or split `READY` and `DONE`?  
Decision: keep the current model. `DONE` means prepared and served; do not add `READY`.

### Public content and board structure

**Q4 — Public order identity**  
Question: guest name, sequence number, or both?  
Decision: guest name.

**Q5 — Visible order data**  
Question: name/status only, compact product summary, or full details?  
Decision: show guest name, status, and a compact product summary. Do not show notes or customizations.

**Q6/Q10 — Finished-order retention**  
Question: retain for the session, temporarily, or until manual removal? Exact duration?  
Decision: `DONE` remains visible for 5 minutes; `CANCELLED` for 2 minutes.

**Q7 — Layout**  
Question: columns, chronological list, or active/finished split?  
Decision: `Pending`, `Preparing`, and `Recently served` columns on wide screens; stack the same sections on mobile.

**Q8 — Route**  
Question: dedicated route, individual-status parameter, or entry-mode selector?  
Decision: dedicated `/session/:code/board` route plus a `View board` link from the session page.

**Q9/Q13 — Closed session**  
Question: freeze, clear, or reject; what happens after reload?  
Decision: an already-open board freezes its last state and shows `Session ended`. A reload after closure shows only `Session ended`, not the final orders.

**Q11 — Multiple orders from one guest**  
Question: separate cards or merge by guest?  
Decision: one card per order.

**Q12 — Ordering within sections**  
Question: oldest or newest first?  
Decision: `Pending` and `Preparing` oldest first; `Recently served` newest first.

**Q14 — Lost connection**  
Question: retain data with warning, replace with error, or fail silently?  
Decision: retain last-known data and show `Reconnecting…`.

**Q15 — Language**  
Question: English, Spanish, or add localization?  
Decision: English, matching the current application.

### Status granularity and card density

**Q16 — Order versus item status**  
Question: one status for the whole order or one per item?  
Decision: one shared status per order. The order remains `PREPARING` until all its items have been served, then becomes `DONE`.

**Q17 — Orders with many items**  
Question: show all lines, a count only, or truncate?  
Decision: show at most 3 product lines, followed by `+N more`.
Revised during implementation: `order_items` has no position column and the repository sorts items by `menu_item_id`, a random UUID, so "the order's own item order" does not exist in the data. The public projection sorts lines by product name before truncating, so the 3 shown are stable across refetches. Adding a position column was considered and rejected as out of scope for this change.

**Q18 — Cancelled-order placement**  
Question: fourth column, pending column, or separate area?  
Decision: temporary red strip below the three main columns.

### Public data boundary and live updates

**Q19 — Public contract**  
Question: dedicated public projection, full DTO hidden by UI, or web-only filtering?  
Decision: dedicated public projection containing only the approved display data.

**Q20 — Live update transport**  
Question: snapshot plus invalidation, incremental SSE payloads, or polling?  
Decision: fetch a complete public-board snapshot; SSE only signals that it changed, then the client refetches.

**Q21 — Overflow**  
Question: manual scrolling, automatic pagination, or dynamic shrinking?  
Decision: normal vertical scrolling.

**Q22 — Empty columns**  
Question: keep or hide empty columns?  
Decision: always retain all three columns for a stable layout.

**Q23/Q25 — Header and QR**  
Question: session name/code/QR, and where should QR lead?  
Decision: show session name, code, and a QR linking to `/session/:code`. Show the QR only on wide screens.

**Q24 — Retention authority**  
Question: server projection, browser history filtering, or actual deletion?  
Decision: the server projection determines visibility and returns `visibleUntil`; the browser removes the card when it expires. Orders remain stored internally.

**Q26 — Closure event**  
Question: freeze and stop, freeze and reconnect, or clear?  
Decision: freeze current cards, stop updates/reconnection, and show `Session ended`.

### Shared-display behavior

**Q27 — Screen wake lock**  
Question: request a wake lock or leave it to device settings?  
Decision: request a screen wake lock when supported, with silent fallback.

**Q28 — Motion**  
Question: subtle motion, none, or prominent animation?  
Decision: brief column transitions and new-order highlighting; respect `prefers-reduced-motion`.

**Q29 — Sound**  
Question: sound on `DONE`?  
Decision: no sound.

### Existing API exposure and visual direction

**Q30 — Session-code discovery**  
Question: may the API publicly list active sessions and codes?  
Decision: no. Listing active sessions/codes becomes host-only; guests must know the code.

**Q31 — Existing full-order reads**  
Question: protect existing reads, fix only the new board, or accept current exposure?  
Decision: full-order reads become host-only. Add reduced public reads for the board and individual guest view, and sanitize public SSE.

**Q32 — Visual direction**  
Question: current light Qup style, dedicated dark board, or device theme?  
Decision: current light Qup style with larger text and stronger contrast.

**Q33 — Fullscreen**  
Question: in-app fullscreen control or browser/device controls only?  
Decision: add a discreet `Enter fullscreen` button and hide it while fullscreen is active.

## Verified code facts

- `/session/:code/status` currently shows every order when `?guest=` is absent; its guest filtering is client-side.
- Public HTTP endpoints currently expose active session codes and complete order DTOs.
- Current session SSE emits a complete order on `order:created`; it is not a safe public projection.
- `Order` owns one status; `OrderItem` has no independent status in domain, database, DTO, API, events, or UI.
- Status transitions are `PENDING → PREPARING → DONE` and `PENDING → CANCELLED`.
- `DONE` and `CANCELLED` currently remain stored and visible indefinitely.
- Resolving a session by code currently rejects closed sessions.
- SSE uses an in-memory event bus, has no replay, and assumes a single API process for reliable delivery.

## Current implementation consequences

- Add the `/session/:code/board` web route and dedicated board view model.
- Add a public-board snapshot contract and endpoint keyed by session code.
- Add sanitized invalidation/closure SSE events; do not publish order payloads publicly.
- Protect active-session listing and complete session-order reads with host authorization.
- Move individual guest filtering to a reduced server-side public read.
- Preserve the admin queue's complete data and status controls.
- Apply retention without deleting stored orders.
- Handle wake lock, fullscreen, QR, reconnecting state, closure freeze, motion reduction, and responsive layout.

## API contracts and delivery constraints

**Q34 — Public endpoint shape**  
Question: dedicated session-scoped board endpoints, top-level board endpoints, or query modes on existing endpoints?  
Decision: use `GET /sessions/code/:code/board` for snapshots and `GET /events/sessions/:code/board` for sanitized invalidation/closure events.

**Q35 — Individual guest identity**  
Question: retain code plus guest name, issue a guest token, or reuse the board projection?  
Decision: retain the lightweight code-plus-name trust model, but filter on the server and document that a guest name is not authentication.

**Q36 — Admin live updates**  
Question: sanitized invalidation plus authenticated refetch, authenticated full-payload SSE, or polling?  
Decision: reuse sanitized invalidations and refetch the protected complete snapshot through authenticated server functions.

**Q37 — Initial and empty states**  
Question: specialized states or a generic error?  
Decision: distinguish invalid code (`Session not found`), closed session (`Session ended`), and an open empty board (`No orders yet`) while retaining the three empty columns.

**Q38 — Test scope**  
Question: focused server/view-model tests, full browser E2E, or server-only tests?  
Decision: add no automated tests for now. Implementation should still be checked with the workspace's existing Nx validation targets.

**Q39 — Live-update deployment constraint**  
Question: accept one API process, add shared pub/sub, or add polling fallback?  
Decision: explicitly support a single API process for this home application and document that in-memory SSE delivery is not multi-replica safe.

### Technical decisions

**Q40 — Stable public card identity**  
Question: expose the existing UUID as a non-displayed key, add a separate persisted public ID, or omit stable identity and weaken transition tracking?  
Decision: include the existing order UUID as a non-displayed `id`. Protected endpoints do not authorize by possession of that UUID, and avoiding a new persisted identifier keeps the model simple.

**Q41 — Snapshot DTO shape**  
Question: return a flat list of summaries for client-side grouping, return server-grouped columns, or split sections into endpoints?  
Decision: return one snapshot with session header data and a flat order-summary list; the client groups and sorts it for presentation.

**Q42 — Invalidation bursts**  
Question: coalesce refetches, refetch once per event, or use a fixed throttle?  
Decision: allow one request in flight, queue at most one trailing refresh, and ignore stale responses.

**Q43 — HTTP error semantics**  
Question: preserve current domain-specific statuses or normalize public failures?  
Decision: retain `422` for malformed code, `404` for unknown session, and `409` for closed session; map them to the Q37 UI states.

**Q44 — Validation without new tests**  
Question: which existing automated checks and manual verification should run?  
Decision: run existing Nx typecheck, build, and unit-test targets plus a manual board walkthrough; add no test files.

## Proposed public contracts

```ts
interface PublicOrderBoardDto {
    session: {
        name: string;
        code: string;
    };
    orders: PublicOrderSummaryDto[];
}

interface PublicOrderSummaryDto {
    id: string; // existing UUID; stable rendering key, never displayed
    guestName: string;
    status: "PENDING" | "PREPARING" | "DONE" | "CANCELLED";
    items: Array<{
        name: string;
        quantity: number;
    }>; // at most 3 product lines, ordered by name
    hiddenItemCount: number;
    visibleUntil: string | null;
}
```

- `GET /sessions/code/:code/board` returns the snapshot.
- `GET /events/sessions/:code/board` emits payload-free `board:changed` and `session:closed` events.
- `GET /sessions/code/:code/orders?guest=:name` returns only that guest's display data; the name is a filter, not authentication.
- Complete session/order reads and active-session listing require host authorization.

## Acceptance criteria

- A guest who knows an open session code can open `/session/:code/board` without a host PIN.
- Wide screens show three stable columns; narrow screens show the same sections stacked.
- Cards show guest name and at most three product lines ordered by product name, then `+N more`; notes and customizations never reach the board response.
- `Pending` and `Preparing` sort oldest first; `Recently served` sorts newest first.
- `DONE` disappears after 5 minutes and `CANCELLED` after 2 minutes without deleting stored orders.
- Cancelled cards appear in a temporary red strip below the main columns.
- The header shows session name, code, wide-screen join QR, and a fullscreen control.
- The board requests a wake lock when supported, uses subtle reduced-motion-aware transitions, and emits no sound.
- SSE invalidations coalesce snapshot refetches; lost connections retain data and show `Reconnecting…`.
- A close event freezes the open board, stops reconnection, and shows `Session ended`; a later reload shows only that state.
- Invalid, unknown, closed, and open-empty sessions produce the distinct states agreed in Q37/Q43.
- Active-session codes and complete order data are no longer publicly listable.
- Admin and individual status screens retain their existing user-visible capabilities through protected or server-filtered reads.
- Live events explicitly support one API instance; no shared pub/sub or polling fallback is added.
- No automated test files are added. Existing Nx typecheck, build, and unit-test targets pass, followed by a manual walkthrough.

## Implementation outline

1. Add shared public DTOs and server-side public projections.
2. Add board snapshot and sanitized SSE routes; protect complete reads and session listing.
3. Migrate guest/admin reads and live refresh to the new access boundary.
4. Add board view model with refetch coalescing, expiry timers, reconnect/closure handling, wake lock, and fullscreen state.
5. Add responsive board route, compact cards, cancellation strip, header, and QR.
6. Run existing Nx checks and manually verify the acceptance criteria.

## Unresolved questions

None. Awaiting confirmation that this document reflects shared understanding before implementation.

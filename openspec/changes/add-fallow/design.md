# Design: add-fallow

## Context

Full research + adversarial free/paid verification + per-finding triage done in explore phase (MON-204). Raw analysis: 143 dead-code findings, 2.96% duplication, 0 circular deps, health 86.7/100. Triage against code: ~25 real, ~130 false positives (config-fixable), ~30 defer. fallow v3.0.0, MIT, single-maintainer project <4 months old — adoption is low-risk (dev-only tool, trivial to remove) but pin exact versions.

## Goals / Non-Goals

**Goals:** free-only adoption, zero-dead-code invariant, new-code PR gate, real debt fixed now, deferred debt visible and reasoned.

**Non-Goals:** replacing knip (coexist; revisit with usage data), architecture boundary zones (no Nx tag taxonomy exists — phase 2), CSS gating (v3 audit css checks stay verdict-neutral defaults), runtime/paid layer (never).

## Decisions

- **No baseline files; attack debt + inline suppressions**: user decision. Inline `fallow-ignore-*` and `@expected-unused` are staleness-tracked (unlike config ignores, verified empirically: unmatched `ignoreDependencies`/`entry`/`ignorePatterns` rot silently) — hence `require-suppression-reason: warn` and preferring config fixes only for structural FPs (framework entries, tool-loaded deps).
- **qup-web entries mirror knip EXCEPT `src/server/**`**: knip's blanket server entry masked the dead `logout()` RPC endpoint; static import graph reaches all live server fns, so omitting keeps dead "use server" endpoints detectable.
- **`lint:fallow` = root script, dead-code only, `--fail-on-issues`**: whole-graph tool (846ms full repo) — per-package Nx targets would re-analyze everything 22× for output filtering only; root script matches how CI already invokes knip whole-workspace (`pnpm run lint:knip`). Health stays report-only in v1 (CRAP scores are estimates without lcov; wiring real coverage is a stretch task). Dupes gated only via PR audit (new-only).
- **CI inside `ci.yml`, not a separate workflow**: sharedGlobal cache bust is one-time per edit, and we edit ci.yml anyway. PR = action step (`command: audit`, `gate: new-only`, `comment: true`, needs `pull-requests: write`), SHA-pinned per `ci-github-actions-pinning`; action's `version` input omitted so it uses the package.json pin. Push = `pnpm run lint:fallow`.
- **Dedup fixes are 3 named refactors**: `errorJson(c, error)` in `apps/qup-api/src/errors/error-mapping.ts` (kills 13 occurrences / 4 clone groups); `VmStatus` and `OrderCard` components in new `apps/qup-web/src/components/` (kills 3 groups + duplicated `STATUS_COLORS`). Nothing crosses packages → no new workspace package.
- **`@kobalte/core` kept ignored (mirror knip)** rather than removed: existing deliberate keep decision; removing is a separate product call.

## Risks / Trade-offs

- [fallow bus factor ≈1, 2 releases/day] → exact pin + Renovate PRs; MIT + trivial uninstall as exit.
- [pnpm `minimumReleaseAge: 1440` blocks <24h-old versions] → pin newest version ≥24h old at implementation time.
- [Generic-inference FPs recur in new code (neverthrow chains, `container.get<T>()`)] → `publicPackages`/`ignoreDecorators` cover current patterns; report upstream (4 verified issues: SolidStart plugin not activating, generic-receiver member resolution, abstract-member auto-fix would not compile, no staleness for config ignores).
- [Audit gate friction on PRs] → `gate: new-only` default; inherited findings shown but non-blocking.

## Open Questions

- Boundary zones (layered preset over `*-domain`/`*-data`/apps) — phase 2, needs tag/zone taxonomy discussion.
- fallow-skills plugin install (agent ergonomics + optional commit-blocking agent-gate hook) — optional task, user call at implementation.

## As-built deviations (implementation, 2026-07-06)

- **Pin `fallow@3.0.0`**: installed 2.104.0 first (only version ≥24h old on day 1); 3.0.0 crossed `minimumReleaseAge` mid-implementation and matches the evaluated version — bumped.
- **`ignoreDecorators: ["injectable"]` is inert**: fallow matches member-level decorators only; class-level `@injectable()` never matches (warns every run). Kept per spec; upstream issue.
- **Config keys beyond spec minimum** (spec says "at minimum"): `usedClassMembers` (`extends: BaseViewModel`; `implements: MenuItemRepository/OrderRepository/SessionRepository` — v3 dropped generic-receiver AND interface-dispatch member linking), `ignoreExportsUsedInFile: { type, interface }` (CartItem, task 5.5 config path), `ignoreUnresolvedImports: ["/vite.svg"]`, entries for `oxfmt.config.ts` + `validate-branch-name.config.cjs`, `duplicates.ignore: ["**/*.test-d.ts"]` (type-assertion boilerplate trio in ts-types).
- **Workspace-scoped dependency ignores don't exist in fallow**: `pg` / `@kobalte/core` are global `ignoreDependencies` entries with scope intent documented in JSONC comments.
- **`errorJson`**: 16 branches replaced, not 13 (event.routes.ts had one more identical clone); `app.ts` onError left as-is. Refactor created 2 new handler-shell clone groups (uniform `result.match(ok/errorJson)`) → 3 reasoned `code-duplication` suppressions in menu/order/session routes; handler-factory extraction not warranted.
- **Task 5.3 widened to file-level** on `instrument.ts`: v3 misses cross-package member usage (Instrument getters ARE used by investlab-data mapper). Upstream issue.
- **Task 5.4 mechanism**: JSX `{/* fallow-ignore-next-line */}` comments are not recognized → file-level `fallow-ignore-file code-duplication` on session/[code]/{index,order}.tsx instead of 4 next-line sites.
- **Dup metric semantics**: suppressed clones still count toward `duplication_percentage`; only analysis exclusion reduces it. Post test-d exclusion + suppressions `fallow dupes` reports 0 groups.
- **`@stryker-mutator/api`** needed in root (stryker.config.base.mjs) AND react-clean/react-hooks/ts-types (own stryker.config.mjs import it) — v3 attributes imports per workspace.
- **Extra DI keeps**: `HttpClient`/`EventSourceService` (qup-web) members file-suppressed — bound in container, never resolved; same defer pattern as investlab port impls.
- **qup-domain dead methods masked by `publicPackages`**: fallow no longer reported them post-config; deleted anyway per triage (task 3.3).
- **`global.css` finding** was the fix-qup-web-wiring bug; that change was implemented (user-approved) to make the zero-issue gate green rather than suppressing a real bug.
- **Upstream issue list grew to 7**: original 4 + ignoreDecorators class-level gap + v3 interface-dispatch member-linking regression + v3 cross-package member-usage regression (JSX suppression-comment support is an 8th, minor).

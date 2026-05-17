## Context

Commander now has three CRUD commands against the user-scoped registry (`commander-add`, `commander-list`, `commander-delete`). The next step is **acting on the catalog**: applying npm updates across every registered project from a single invocation.

Three pieces already exist and are reused verbatim:

- `commander-registry` (read contract) — `<HOME>/.claude/commander/projects.json`, schema v2, lazy-create on read.
- `experiments:scan-npm-updates` (skill) — given `level`, returns a `ScanResult` for the current working directory's project. Project-agnostic (pnpm/npm/yarn/bun/deno), workspace-aware, catalog-aware, release-age-aware.
- `/experiments:npm-update-patch` (command) — applies bumps to a single project: `ncu --upgrade --target patch` per `package.json`, in-memory edits for `pnpm-workspace.yaml#catalog`, one install. Inherits a `pkg-upgrade-overrides.yaml` for Storybook-style families.

The bridge missing today is the **fan-out / fan-in** layer: how to take a list of projects from the registry, run scans in parallel, deduplicate updates by package, render a single cross-project plan, and apply each project sequentially.

This change ships that bridge as a shared skill (`commander-update-orchestrator`) and the first consumer command (`/experiments:commander-update-patch`). The orchestrator is reused — without code change — by the upcoming `-minor`/`-major`/`-engines` siblings (MON-195/196/197) and the deep variants (MON-154).

Constraints inherited from the broader Commander/experiments design:

- Pure built-in tools (`Read`, `Bash`, `AskUserQuestion`, `Agent`, `Skill`, `Edit`). No new runtime, no new package, no new MCP server.
- Read-only against the registry. Apply touches each project's own manifests/lockfiles, never the registry.
- No auto-commits, no auto-PRs, no test/lint/build invocation.
- Drift surfacing follows the existing `commander-list` pattern (`[missing path]`, etc.) — never auto-fix.

## Goals / Non-Goals

**Goals:**

- One slash command (`/experiments:commander-update-patch`) that reads the Commander registry, prompts for a project subset, applies patch updates across the chosen projects, and prints a unified summary.
- One reusable skill (`commander-update-orchestrator`) that owns the fan-out/fan-in pipeline and is parameterized by `level`/`target` so the three sibling commands and four deep variants drop into the same plumbing.
- Token-aware design: scans are dispatched as parallel Haiku subagents so the main agent's context doesn't accumulate N raw `ScanResult` outputs.
- Predictable failure mode: apply is sequential and stops on first failure, leaving the user with a clear "applied / failed / pending" partition to re-run from.

**Non-Goals:**

- `/experiments:commander-update-{minor,major,engines}` — separate sub-issues (MON-195/196/197). They will reuse the orchestrator skill verbatim with a different `level`/`target` pair.
- Deep variants (`commander-update-deep-*`) — MON-154. They will compose the orchestrator with the existing `parallel-research-workflow` skill; this change does not pre-design that integration.
- Per-project parallel apply. Apply is strictly sequential to keep failure handling simple and to avoid contention on shared system caches (`~/.npm`, `~/.pnpm/store`).
- Cross-machine sync of the registry. Not a goal of this change or the broader Commander epic.
- Auto-migration of v1 registry records. Legacy v1 records (no `repoType`) are accepted as-is by the orchestrator; `repoType` is not consumed by scan or apply.
- Shared "apply skill" extracted from `npm-update-patch`. The orchestrator inlines the per-project apply recipe (Step 6 of `npm-update-patch.md`). Extraction to a shared `apply-npm-updates` skill is deferred until a third consumer beyond `npm-update-patch` and the orchestrator emerges.
- Lockfile/concurrency for the registry. Single-invocation assumption carries over from v1.
- Tests. Manual verification only, mirroring the rest of the experiments plugin.

## Decisions

### Decision 1 — Skill vs inline orchestration

Extract the cross-project pipeline into a dedicated skill (`commander-update-orchestrator`) rather than inlining the logic in `commander-update-patch.md`.

**Rationale:**

- **Eight known consumers, not one.** The orchestrator will be invoked by `commander-update-{patch,minor,major,engines}` (MON-153a/b/c/d, four commands) and by the deep variants (MON-154, four more commands). The "DRY-on-3" rule already applies on day one.
- The orchestration spec is ~200 lines of behavior. Inlining it into four (or eight) command files multiplies that cost without changing the underlying logic.
- Bug-fix concentration: a fix in the version-alignment policy or the parallel-scan dispatch lives in one place.
- Closes MON-152 in the same PR. MON-152 ("Capa de orquestación cross-project") would otherwise sit as a follow-up ticket with no clear deliverable.

**Alternatives considered:**

- *Inline in the patch command, extract on the third consumer*: rejected. We already have eight known consumers; the abstraction is justified now. Extracting later would require refactoring code that already shipped to users.
- *Skill that wraps the four commands as well* (so each command becomes pure metadata): rejected. The slash command's frontmatter and entry-point contract is a Claude Code primitive we cannot move into a skill — the command file must exist for `/experiments:commander-update-patch` to register. The thin command wrapper (~30 lines) is unavoidable.

### Decision 2 — Parallel scan, sequential apply

Scans are dispatched in parallel via N `Agent` tool-uses in a single message (one per project, Haiku model, with each agent's CWD set to the project's `path`). Apply is strictly sequential, project-by-project, in registry insertion order.

**Rationale:**

- **Scans are read-only and idempotent.** Parallelism is a clean win for latency (`max(scan_i)` instead of `sum(scan_i)`) and for context (the main agent only sees N small `ScanResult` JSON blobs, not the raw `ncu` stdout × N).
- **Apply is write-heavy.** Sequential apply makes failure handling tractable: if project 3 of 5 fails, we know exactly what landed (1 and 2), what failed (3), what's pending (4 and 5). Parallel apply would force us to handle partial-state across projects, which is far more complex and offers no real speedup (`ncu` + `pnpm install` is dominated by network and disk I/O, not CPU).
- **No "teams" feature.** Claude Code's experimental teams API is designed for multi-conversation coordination with shared state, not for fan-out of short-lived scans. The `Agent` tool's parallel-call pattern is sufficient and stable.

**Alternatives considered:**

- *Sequential scan*: rejected. With ~5 registered projects and ~30s per scan, sequential takes 2.5 min before the user sees anything. Parallel finishes in 30–45s.
- *Parallel apply*: rejected. Manageability of partial state outweighs the marginal latency win.
- *Teams API*: rejected. Experimental flag + heavyweight semantics for what is essentially a pure-fan-out problem.

### Decision 3 — Version alignment: max-wins with per-project fallback

When the same package shows different `targetVersion` across projects, the orchestrator computes `proposedTarget = max(targetVersion)` and validates that every occurrence's declared range admits this max. If any range does not admit it, the orchestrator raises **one** `AskUserQuestion` covering every conflicting package with three options:

- `use-max-where-possible` — apply max where the range admits, leave the rest at their per-project target.
- `per-project` — every occurrence keeps its per-project target (alignment off for conflicts).
- `skip-package` — drop conflicting packages entirely.

**Rationale:**

- **Max-wins matches user intent**: registering N projects under Commander signals "I want them aligned". Defaulting to max gives the user the highest agreement-able version automatically.
- **Per-project fallback respects range declarations.** A project pinned to `~4.17.21` is intentional; coercing it past its range would silently break the project's stated upgrade contract.
- **One prompt, not N.** A user with 12 conflicting packages does not want to answer 12 questions. The single-policy prompt keeps the run interactive but bounded.

**Alternatives considered:**

- *Always max, fail on range violation*: rejected. Surfaces as a hard error mid-apply, leaving partial state.
- *Always per-project, no alignment*: rejected. Defeats the cross-project value proposition — if alignment never happens, why use Commander at all for this?
- *Per-package prompts*: rejected. Hostile UX for any non-trivial run.
- *Min-wins instead of max-wins*: rejected. Min would prefer the most conservative target and lose the patch fixes the higher-versioned project already enjoys.

### Decision 4 — Sequential apply with stop-on-fail

When a project's apply step (`ncu --upgrade`, override command, `<pm> install`) fails, the orchestrator stops the entire run. Subsequent projects are not attempted; the summary partitions the resolved set into applied / failed / pending and instructs the user to re-run after addressing the failure.

**Rationale:**

- **Predictable partial state.** The user can `git diff` each applied project, fix the one that failed, and re-run with confidence about what's been done.
- **No silent skips.** Continuing past a failure could mask systemic problems (e.g., a registry override misresolving `{version}`).
- **Mirrors `npm-update-patch.md`.** That command stops on the first failed file too. Cross-project apply continues that contract at the project granularity.

**Alternatives considered:**

- *Continue past failures*: rejected. Hides failures and produces a confusing summary.
- *Auto-rollback applied projects*: rejected. Out of scope; the registry has no "before" snapshot, and `git stash` per project is invasive.

### Decision 5 — Override registry consulted once per matched entry across the run

The `pkg-upgrade-overrides.yaml` registry (Storybook, etc.) is loaded once per run. When a matched entry's packages span multiple projects, the override prompt fires **once**, not per project. The chosen action (`run-override`, `skip-matched`, `force-generic`) applies to every project the entry touches.

`{version}` resolution operates on the cross-project aggregated `proposedTarget` set, not per-project sets. This means a Storybook override running `npx storybook@8.4.7` uses the highest aligned target across all matched projects.

**Rationale:**

- **Token discipline**: an override raised once is one prompt; raised per project is N prompts.
- **Semantic correctness**: Storybook's `npx storybook upgrade` migrates a project's Storybook setup to a target version. If we want all matched projects on the same Storybook version (the whole point of cross-project), the version must come from the aggregated max.

**Alternatives considered:**

- *Per-project override prompts*: rejected for token cost.
- *Skip override registry entirely in cross-project mode*: rejected. Storybook-style families are exactly where misuse of generic `ncu` causes the most pain.

### Decision 6 — Drift handling: skip missing-path, accept legacy-v1

Projects whose registered `path` no longer exists on disk are skipped at resolution time with a `Skipped (path missing)` summary entry. Legacy v1 records (no `repoType`) are accepted as-is — `repoType` is not consumed by scan or apply.

**Rationale:**

- **Mirrors `commander-list`.** That command surfaces the same two drift conditions inline. Doing nothing different here keeps the experience consistent.
- **No auto-fix.** The orchestrator has no mandate to delete or migrate registry records. That belongs to `commander-delete` and a future `commander-update`.
- **Continue past path-drift, not abort.** A user with 10 registered projects, one of which has been moved, does not want the whole run cancelled. Skip + warn is the right behavior.

**Alternatives considered:**

- *Abort on any drift*: rejected. Hostile to the realistic case of one moved/deleted directory among many.
- *Auto-prompt "remove from registry?"*: rejected. Out of scope; the user can `commander-delete` themselves.

### Decision 7 — No `--projects` flag in v1; AskUserQuestion always

Project subset selection is interactive only (multi-select `AskUserQuestion`). No CLI flag for scripted use.

**Rationale:**

- The ticket calls for `AskUserQuestion`. We follow that signal.
- Adding a `--projects a,b,c` flag now risks committing to a name format we'll regret (case sensitivity? subprojects?). Easy to add when a real scripted use case appears.

**Alternatives considered:**

- *`--projects` flag as pre-filter*: rejected for v1, deferred until a caller exists.
- *`--all` flag to skip the picker*: rejected. The picker has an "all" option already; `--all` is just CLI sugar.

### Decision 8 — No skill extraction of the per-project apply recipe

The orchestrator's per-project apply step inlines the `ncu --upgrade` + catalog edit + install recipe from `npm-update-patch.md` Step 6, rather than extracting a shared `apply-npm-updates` skill that both consume.

**Rationale:**

- **Two consumers is not enough to extract.** `npm-update-patch.md` has had this recipe stable for one ticket cycle; the orchestrator is the second consumer. The deep variants (MON-154) might be a third — at that point, extraction is justified and the API will be clearer.
- **The recipe is small (~50 lines).** The maintenance cost of duplication is low and the discipline of a tiny recipe is easier than the abstraction tax of a third skill.
- **MON-150's modularization note is forward-looking.** The deep variants need to "separate research from apply"; that is a different refactor than this one. We will address it when the deep variants land.

**Alternatives considered:**

- *Extract a shared `apply-npm-updates` skill now*: rejected for premature-abstraction reasons above.

## Risks / Trade-offs

- **Parallel `Agent` dispatch with N projects increases output token usage**, but each `ScanResult` is small (~1KB JSON) and bounded — the savings come from not piping `ncu` stdout through the main agent. → Mitigation: Haiku model, enforce JSON-only output in the agent prompt, reject non-JSON responses.
- **Sequential apply with stop-on-fail leaves partial state.** → Mitigation: explicit summary partitioning (applied / failed / pending) and clear "re-run to retry" guidance. The user is in control; the orchestrator never tries to be clever.
- **Version alignment policy may surprise users** who don't realize one project's range blocks the max. → Mitigation: the conflict prompt explicitly names the conflicting package(s) with their ranges; the `use-max-where-possible` option is offered as a safe default.
- **Override registry across projects** has subtle semantics (one entry, many projects, one chosen action). → Mitigation: the prompt copy explicitly lists every matched package across every matched project so the user can see the blast radius.
- **No tests.** Same posture as the rest of the experiments plugin. → Mitigation: the manual verification matrix in `tasks.md` covers the realistic cases (single project, multiple projects, missing path, scan-failed, conflict policy paths, override paths, cancel paths, partial failure).
- **Registry drift mid-run.** Theoretically a user could `commander-add` or `commander-delete` while the orchestrator is running. → Mitigation: the orchestrator reads the registry exactly once at resolution time. Mid-run mutations do not affect the in-memory project set.

## Migration Plan

- No registry schema change; no migration needed. Schema stays at v2.
- Plugin version bump (patch) follows the existing plugin-version-bump skill.
- Branch: `feature/MON-194-commander-update-patch` (already checked out, renamed from MON-153).
- Single PR. No staged rollout. The orchestrator skill is invoked only by the new command in v1; existing commands are untouched.

## Open Questions

_None._

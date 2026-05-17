## Context

Two flows already ship in the experiments plugin and inform this change:

1. **`/experiments:commander-update-patch` ([MON-194](https://linear.app/monolab/issue/MON-194))** — cross-project shallow patch application. Thin command file invokes the `commander-update-orchestrator` skill, which owns the entire pipeline: resolve projects from `<HOME>/.claude/commander/projects.json`, parallel scan dispatch via N Haiku agents, cross-project aggregation, version alignment (max-wins with per-project fallback), override registry consultation, user confirmation gate, sequential apply with stop-on-fail, aggregated summary.
2. **`/experiments:npm-update-deep-patch` ([MON-145](https://linear.app/monolab/issue/MON-145))** — single-project deep patch application. Command file owns the orchestration: scan → group → research → plan-mode synthesis → apply (bumps then improvements via plan-mode). The research piece is delegated to `parallel-research-workflow` and `group-packages-for-research`.

MON-199 is the cross-product: cross-project + deep. The hard design question is **how to compose the two flows without duplicating the cross-project plumbing or breaking the shipped contracts of either side**. A naive composition (run deep N times, once per project) defeats the deduplication goal and produces N times the changelog reads, N times the research, and N redundant plan-mode rounds. A naive merge (one giant new skill) is unmaintainable.

Three operational sub-problems drive the rest of this design:

- **Where does research live in the cross-project pipeline?** The orchestrator's scan-and-aggregate already produces a deduplicated package set. Research keys off that set, not off per-project scans. The question is whether the orchestrator owns the research step or hands off to a sibling skill.
- **How does universal research translate to per-project edits?** The single-project deep flow couples research to the codebase (subagents cross-reference the changelog against the local code). In cross-project, the "codebase" is N codebases. We have to pick: research per project (defeats dedup), research with N-codebase context (subagent context blow-up), or research universally and verify per-project at apply time.
- **One plan-mode round or N?** Single-project deep enters plan-mode after bumps to walk improvements. With N projects, doing this per project means N rounds of user friction. MON-199 explicitly calls for "one cross-project plan", which strongly suggests one unified plan-mode round.

Constraints inherited from the broader Commander / experiments design:

- Pure built-in tools (`Read`, `Bash`, `Edit`, `Write`, `AskUserQuestion`, `Agent`, `Skill`). No new runtime, no new package, no new MCP server.
- Read-only against the registry. Apply touches each project's own manifests; never the registry; verifiable via `shasum`.
- No auto-commits, no auto-PRs, no test / lint / build invocation.
- Stop-on-fail leaves predictable partial state (applied / failed / pending). No rollback magic.
- Plan dirs live under `<HOME>/.claude/experiments/plans/` (user-level, separate from the commander registry, separate from project repos).

## Goals / Non-Goals

**Goals:**

- One slash command (`/experiments:commander-update-deep-patch`) that reads the registry, prompts for a project subset, runs **deduplicated** research across the cross-project package set, synthesizes one cross-project plan, applies bumps sequentially with stop-on-fail, and runs one unified plan-mode round for improvements at apply time.
- Composable plumbing: the orchestrator gains a `mode: "shallow" | "deep"` toggle; the research workflow gains a `mode: "single-project" | "cross-project"` toggle. Both shipped callers (shallow `commander-update-patch`, single-project `npm-update-deep-patch`) are byte-equivalent to today.
- Research deduplication: changelog fetch and codebase-impact synthesis run **once per package version range**, not once per (package, project). A package appearing in 4 of 5 projects costs 1× research, not 4×.
- Predictable failure mode: bumps phase uses stop-on-fail with the existing applied / failed / pending summary partition. Plan-mode improvements phase comes AFTER all bumps land — if the user rejects the plan-mode round, bumps are preserved (mirrors single-project deep-patch).

**Non-Goals:**

- `/experiments:commander-update-deep-{minor,major,engines}` — separate sub-issues ([MON-200](https://linear.app/monolab/issue/MON-200), [MON-201](https://linear.app/monolab/issue/MON-201), [MON-202](https://linear.app/monolab/issue/MON-202)). They reuse the orchestrator's deep mode and the workflow's cross-project mode with a different `level`/`target` pair.
- Per-project parallel apply. Apply is strictly sequential to keep failure handling simple and match the shallow orchestrator's contract.
- Per-(project, package) research. Research is deduplicated to package level by design.
- Subagent-driven codebase cross-reference in cross-project mode. Subagents produce universal findings only; per-project applicability is checked by the main agent in plan-mode at apply time.
- Auto-rollback of applied bumps when the plan-mode round is rejected. Bumps are preserved; the user reviews `git diff` per project. Same posture as single-project deep-patch.
- Cross-machine registry sync, registry concurrency / locking, auto-migration of v1 records, `--projects` CLI flag, `--all` CLI flag — all out of scope, mirroring the shallow `commander-update-patch` posture.
- Tests. Manual verification only, mirroring the rest of the experiments plugin.

## Decisions

### Decision 1 — Extend the orchestrator with `mode: "shallow" | "deep"` (vs new sibling skill or refactor into phases)

Add a `mode` input to `commander-update-orchestrator` with default `"shallow"`. The shallow path is preserved byte-for-byte. The deep path inserts:

- **Step 6.5** — Group the deduplicated package set with `group-packages-for-research`, then invoke `parallel-research-workflow` with `mode: "cross-project"`, `slugOverride: "commander-deep-<level>"`, and the aggregated `CrossProjectPlan` repackaged as the workflow's `scanResult` input.
- **Step 7** — Plan rendering switches to a research-aware shape (improvements + workarounds sections from `plan.md`, plus the cross-project bump set table). The skill still emits the shallow table when `mode === "shallow"`.
- **Step 9** — The confirmation gate gains an `apply-bumps-only` option (mirroring single-project deep-patch). Shallow mode keeps the three-option gate it has today.
- **Step 10** — After all bumps land successfully across all projects, the orchestrator enters ONE plan-mode round and walks the improvements section, performing reconnaissance per (improvement, affected project) and presenting the unified edit set for user approval.

**Rationale:**

- **One skill, one cross-project contract.** Duplicating ~400 lines of cross-project plumbing into a sibling skill would create two places to fix the same bug. The orchestrator was already designed with deep variants in mind (see its own SKILL.md description: "Composed by future `commander-update-deep-*` commands together with the `parallel-research-workflow` skill").
- **Backward-compatible default.** Shipped `/experiments:commander-update-patch` continues to invoke the orchestrator with no `mode` argument; the skill defaults to shallow. No regression risk for the shallow path.
- **The deep-mode insertions are local to four named steps** (6.5, 7, 9, 10) — not pervasive. The shallow path's flow control is unchanged.
- **The orchestrator only grew in MON-194.** It is at v0 from a public-contract perspective (one consumer, one ticket cycle). Editing it now is cheaper than at v3 with eight consumers.

**Alternatives considered:**

- *New sibling skill `commander-update-deep-orchestrator` that reimplements cross-project plumbing*: rejected. Duplication of the 400-line cross-project pipeline is exactly the maintenance trap MON-152's "shared orchestration layer" decision avoided.
- *Refactor `commander-update-orchestrator` into composable phases (resolve, scan, aggregate, override, gate, apply, summary) with the deep variant calling phases in order with research inserted*: rejected for v1. The refactor breaks the orchestrator's current "do the whole thing" contract and forces every existing call site (the shallow `commander-update-patch` command) to switch to phase-based invocation. The cost outweighs the benefit at one+one consumers. Revisit when a third command exposes an alternative composition need.
- *Compose at the command level (`commander-update-deep-patch.md` calls orchestrator → research workflow → orchestrator again for apply)*: rejected. The orchestrator's apply step needs to know about the research artifact (to render the unified plan, to drive plan-mode); chopping the orchestrator in half just for one extra consumer is the same refactor as the option above, with less encapsulation.

### Decision 2 — Universal-only research; per-project applicability decided at apply time

Subagents in `cross-project` mode receive a list of packages plus the version ranges, and instructions to:

1. Fetch the changelog for each package (`experiments:npm-changelog`).
2. Produce `research.md` with **universal** findings only — what the version fixes, what API/behavior it introduces — **without reading any project codebase**.
3. Use abstract hints (file globs, framework names, idiomatic patterns) in the findings, NOT codebase-specific paths.

Per-project applicability ("does this codebase actually have a place where this improvement lands?") is verified by the main agent during plan-mode synthesis at apply time, walking each affected project's codebase to translate the universal bullet into concrete edits.

**Rationale:**

- **Dedup matches MON-199's letter.** "Changelogs y research se ejecutan una sola vez por paquete (deduplicados cross-project), no por proyecto" maps directly to one subagent producing one `research.md` per package, regardless of how many projects it touches.
- **Subagent context stays bounded.** Asking a subagent to cross-reference one changelog against N project codebases either (a) explodes its prompt with N codebase summaries, or (b) requires N subagent runs per package. Neither is viable at the typical monolab scale.
- **Plan-mode reconnaissance is already cross-codebase capable.** The main agent in plan mode has the project paths in hand, can `Read` files in each project, and produces edit-level proposals with full code context. This is exactly the structure single-project deep-patch already uses for its post-bumps plan-mode round (Step 6b of `npm-update-deep-patch`).
- **Quality is preserved.** The subagent's universal hints (`hint: hooks-pattern files (use*.ts)`) give the main agent precise breadcrumbs without committing the subagent to specific paths.

**Alternatives considered:**

- *Per-project research (full matrix)*: rejected. N codebases × M packages = N×M subagent runs, the opposite of the dedup goal.
- *Per-project research with project sharding (some projects per subagent)*: rejected. Still defeats per-package dedup; the changelog gets re-read for every project shard that has the package.
- *Universal-only research, applicability check by a second subagent pass (one per project)*: rejected for v1. The second pass duplicates plan-mode's job. Plan-mode is already needed to present concrete edits for user review; piggy-backing applicability onto plan-mode is the simpler design. Revisit if plan-mode reconnaissance becomes a token-budget concern at scale.
- *Universal-only research with applicability fields written by the main agent during phase 4 plan synthesis*: this is a slight variant of the chosen design — the main agent could pre-compute applicability before writing `plan.md`, instead of waiting until apply-time plan-mode. Rejected for v1 because the plan.md is a planning artifact, not a binding contract; rendering applicability there encourages the user to skip the apply-time plan-mode review (which is the only point at which we present concrete edits). Keeping applicability check in plan-mode at apply time preserves the "render concrete edits, then approve" gate.

### Decision 3 — `parallel-research-workflow` gains `mode` + `slugOverride`; cross-project mode changes three things

In `cross-project` mode the workflow differs from `single-project` mode in exactly three places, leaving the rest of the contract intact:

1. **Slug derivation**: uses the required `slugOverride` input instead of `package.json#name`/`basename(CWD)`. The caller supplies `commander-deep-<level>` so the plan-dir basename is predictable: `commander-deep-patch-<unix-ts>[-N]`. Validation: `slugOverride` SHALL be required when `mode === "cross-project"`; abort with `Error: slugOverride is required when mode is cross-project.` otherwise.
2. **Subagent prompt template**: drops the `Codebase root: <CWD>` line; replaces the phase-2 instructions with the "universal findings only" contract (`### Workarounds resolved (universal)`, `### Improvements applicable (universal)`); explicitly forbids the subagent from reading codebase files; allows the subagent to mention abstract hints (file globs by convention, framework names, idiomatic patterns) without committing to specific paths.
3. **Phase 4 plan template**: `plan.md`'s H1 becomes `Deep-<level> plan (cross-project): <slugOverride>`; each improvement/workaround bullet carries an explicit `(group: <groupId>; affects projects: <comma-separated>)` tag derived from the cross-project scan; the bump-set table renders columns `package | proposed target | projects (locations)` instead of `package | current → target | location`.

The workflow's phase 0 stale cleanup, phase init, phase 1 batching, phase 3 integrity gate, end-of-flow cleanup, and field naming conventions are all identical across modes. The fan-out infrastructure (groups, batching cap, hard-wall fallback, retry-failed, degrade-to-main-agent) is mode-independent.

**Rationale:**

- **Backward-compat for `/experiments:npm-update-deep-patch`.** Defaults are `mode: "single-project"` and `slugOverride` unset → existing single-project behavior unchanged.
- **Three localized differences vs forking the skill.** A fork would duplicate the entire batching / integrity / cleanup machinery, which is the workflow's most battle-tested code (see the "hardest-learned lesson" callout in its current phase 1 description).
- **Slug control belongs to the caller.** The orchestrator names plan dirs in a way that lets the next invocation's stale cleanup find them: `commander-deep-patch-<ts>` is regex-matchable by the workflow's phase 0 pattern (`^[a-z0-9-]+-(patch|minor|major|engines)-\d+(-\d+)?$`). Without the override, the workflow would derive the slug from the calling agent's CWD, which is meaningless in cross-project context.

**Alternatives considered:**

- *Fork to `parallel-research-workflow-cross-project`*: rejected. Duplicates the workflow's hardest-to-get-right plumbing (the phase 1 batching + the integrity gate). Both pieces would drift independently.
- *Push the differences into the caller, keep the workflow generic*: rejected. The subagent prompt template is **mandatory** per the workflow's own contract — substituting a looser prompt is a spec violation. The cross-project template needs to live next to the single-project one inside the workflow.
- *Express mode as `codebaseAware: boolean`*: rejected. Less expressive — the slug-derivation change and the plan template change are tied to the mode, not to whether the codebase is read. A future read-only-but-cross-project mode would need yet another flag.

### Decision 4 — Plan-dir layout: `scan-by-project.json` + `cross-project-plan.json` (vs reusing single-project `scan.json`)

Single-project plans store `scan.json` (one `ScanResult`). Cross-project plans store:

- `scan-by-project.json` — a map `{ [projectName]: ScanResult }` capturing every per-project scan verbatim.
- `cross-project-plan.json` — the orchestrator's post-version-alignment `CrossProjectPlan` aggregated form (the deduplicated package set with per-occurrence projection).

`plan.md` and `groups/<groupId>/...` are identical in shape (just with different content per Decision 3).

**Rationale:**

- **The aggregated plan is the artifact the user reviews.** Splitting `scan-by-project.json` (raw) from `cross-project-plan.json` (post-alignment) lets the user inspect both — useful when a version conflict-policy choice surprises them later.
- **Single-project plans are not retroactively impacted.** Single-project mode writes `scan.json` as today.
- **Both artifacts are deterministic.** Writing both at plan-init time lets the workflow be re-entered (e.g. for the cleanup prompt) without re-running the aggregation logic.

**Alternatives considered:**

- *One unified `scan.json` for both modes with a union type*: rejected. Adds discriminant complexity to both readers without saving disk space; both files are small.
- *Skip `scan-by-project.json`, persist only the aggregated form*: rejected. Debugging "why did project X end up with this target?" requires the raw scan; storing just the aggregate erases that.

### Decision 5 — Override registry IS consulted in cross-project deep (divergence from single-project deep)

Single-project `npm-update-deep-patch` deliberately skips the override registry — its rationale is that overrides (Storybook, etc.) belong to the shallow path, and the deep variant can mention them as improvements without auto-executing the override command. Cross-project deep MUST do the opposite: consult overrides, prompt once per matched entry across the run, and route packages to `OVERRIDE_RUN` / `OVERRIDE_SKIP` / `GENERIC` exactly as the shallow orchestrator does.

**Rationale:**

- **Symmetry with shallow cross-project.** A user invoking `/experiments:commander-update-deep-patch` reasonably expects Storybook-style families to be handled the same way `/experiments:commander-update-patch` already handles them. The two should diverge in their "what improvements are worth adopting" reading, not in their "which packages need special-handling" routing.
- **The "run shallow first, then deep" workaround is hostile.** If we matched single-project's stance, the user would have to invoke two commander commands in sequence, neither of which can produce the unified plan we want.
- **The override registry is read-only.** Consulting it adds no additional risk surface beyond the shallow path.
- **The override prompt fires once per matched entry, not once per (entry, project).** Token cost is bounded.

**Alternatives considered:**

- *Match single-project deep: skip overrides, surface as improvements*: rejected for the symmetry argument above.
- *Consult overrides but disable `run-override` (force-generic only)*: rejected. Defeats the whole point of override entries (Storybook's `npx storybook upgrade@<version>` does codemods beyond `package.json` edits).
- *Consult overrides only when the user opts in via a flag*: rejected. v1 has no flag surface; ergonomically inferior to the always-on shallow-parity choice.

### Decision 6 — One unified plan-mode round AFTER all bumps land (vs per-project rounds, vs upfront)

Apply order in deep mode (`apply-all` path):

1. Iterate projects in registry order. For each project: run generic ncu bumps + catalog edits + override commands + one install. Stop-on-fail aborts the entire run.
2. **After every project's bumps land successfully**, enter plan-mode ONCE. The main agent walks the cross-project `plan.md`'s improvements section:
    - For each improvement bullet, compute the set of affected projects (from the bullet's `affects projects` tag, intersected with projects where the bumps already landed).
    - For each (improvement, project) pair, reconnaissance: read the project's codebase areas the bullet hints at; classify as `applicable` (here is the concrete edit) or `inapplicable` (with reason).
    - Render the plan-mode markdown with all applicable edits laid out (path, before/after snippet for non-trivial edits) and all inapplicable entries (with reason).
3. User accepts or rejects the unified plan.
    - Accepted → execute edits across all projects (sequential per-file).
    - Rejected → bumps are preserved; improvements skipped; print rejection notice.

**Rationale:**

- **MON-199 literal: "El main agent genera UN plan cross-project que cubre todos los proyectos".** One plan-mode round honors that.
- **Bumps before plan-mode matches single-project deep-patch's Step 6.** That command bumps first, then runs plan-mode for improvements — the rationale (improvements depend on the new code being installed; reconnaissance reads post-bump state) carries over.
- **One round bounds user friction.** N projects × N rounds is hostile UX for any non-trivial registered set.
- **Stop-on-fail during bumps aborts the whole run including improvements.** Predictable: the summary shows applied / failed / pending bumps; the user re-runs after fixing.

**Alternatives considered:**

- *Per-project plan-mode rounds (after each project's bumps, before the next)*: rejected. N rounds of user friction. Inconsistent with "one cross-project plan".
- *Plan-mode BEFORE any bump (upfront approval of bumps + improvements)*: rejected. Improvements reconnaissance needs the post-bump tree to give honest before/after snippets. Pre-bump reconnaissance reads the OLD code, which is the wrong baseline. (Also: separates the "apply bumps?" gate from the "apply improvements?" gate, defeating the unified UX.)
- *No plan-mode round at all; rely on the synthesized `plan.md` as the only gate*: rejected. Same reasoning as single-project deep-patch's Step 6b — `plan.md` is opportunity-level, not edit-level; presenting concrete edits in plan-mode is the only point at which the user sees what will actually be written.

### Decision 7 — `apply-bumps-only` is a confirmation-gate option (mirroring single-project deep)

The orchestrator's confirmation gate in deep mode offers four options (vs three in shallow):

- `apply-all` — bumps + improvements (single unified plan-mode round).
- `apply-bumps-only` — bumps + already-resolved override actions, no improvements. Equivalent in net effect to `/experiments:commander-update-patch` against the same set: every `run-override` decision resolved in Step 8 still executes (override resolution happens before the gate, so the user has already committed to those actions), every generic ncu bump runs, every per-project install runs. The only thing this path SKIPS relative to `apply-all` is the Step 10b plan-mode improvements round; the Step 11 summary's `Applied improvements` section is omitted.
- `pick-subset` — free-form selection of improvement bullets + package names (excludes from both).
- `cancel` — no side effects.

**Rationale:**

- **Mirrors single-project deep-patch's Step 5.** Same option list, same semantics, same user expectations.
- **The four-option gate is the orchestrator's only ergonomic change in deep mode.** Everything else (override resolution, ncu invocation, install) is unchanged.

**Alternatives considered:**

- *Three options (no `apply-bumps-only`)*: rejected. The user has no first-class way to say "I see the plan but want only the bumps" without going through `pick-subset` with the entire improvements list excluded.
- *Five options (split `apply-all` into `apply-bumps` and `apply-improvements`)*: rejected. Improvements depend on bumps having been applied; running improvements without bumps is incoherent.

### Decision 8 — `pick-subset` accepts both improvement bullets and package names (mirroring single-project deep)

When the user picks `pick-subset` at the deep-mode gate, the prompt:

```text
Enter the IDs to apply (comma-separated or one per line). Use plan-line excerpts for improvements
(case-insensitive substring match), package names for bumps. Empty response cancels.
Improvements: <comma-separated improvement bullet titles from plan.md>
Bumps: <comma-separated unique package names from the cross-project bump set>
```

Parsing mirrors single-project deep-patch Step 6c exactly: substring match for improvements, exact match for bumps, re-prompt on invalid input, treat empty input as `cancel`.

**Rationale:**

- **One UX across deep variants.** Users who learn single-project pick-subset don't have to relearn it for cross-project.
- **The cross-project plan's improvement titles are already unique strings** (each bullet has a leading package name + opportunity description; the package name disambiguates).
- **Bumps are package-name-keyed at cross-project granularity.** A user excluding `react` excludes it from every project that has it (consistent with the shallow orchestrator's `pick-subset` semantics).

**Alternatives considered:**

- *Improvements only (let user exclude packages via the bumps confirmation in a follow-up prompt)*: rejected. Two prompts instead of one; same outcome.
- *Package-name-keyed selection that excludes both bumps and the package's improvements*: rejected. A user might want the bump but not the improvement (or vice versa); coupling them removes the granularity.

## Risks / Trade-offs

- **Universal-only research may surface improvements that don't apply to any selected project.** Plan-mode reconnaissance at apply time catches this — inapplicable improvements are explicitly listed with their reason — but the user reads the plan.md once and may be surprised by the "0 of 10 improvements were actually applicable in my codebase" outcome. → Mitigation: the cross-project plan-mode summary header explicitly states `applicable: <N>` / `inapplicable: <M>` counts (mirrors single-project deep-patch Step 6b); the `plan.md` H2 explicitly says `Improvements (universal — applicability checked per project at apply time)`. The user is informed.
- **Plan-mode reconnaissance reads every affected project's codebase before presenting the unified plan.** For N=8 projects with M=20 improvements, that's up to N×M file-area-reads. → Mitigation: reconnaissance is driven by hint globs from the universal research, not blind walks. The main agent SHALL prioritize improvements with the most affected projects first; if context budget pressure surfaces in practice, the existing single-project reconnaissance can be borrowed as a structured pattern. Plan-mode reconnaissance is intrinsically token-heavy; this is acknowledged in the design and revisited if measurements show it's a bottleneck.
- **Subagent dispatch hard-walls scale with package count, not project count.** Cross-project deep over a registry of 8 projects with mostly-shared dependencies might produce ~20 unique packages → 4–5 groups, well below the workflow's `maxConcurrent` cap. But a registry with mostly-disjoint dependencies (different stacks) could produce 50+ unique packages → 7+ groups, potentially triggering the workflow's hard-wall fallback. → Mitigation: the workflow's existing batched-dispatch + degrade-to-main-agent path applies unchanged. Cross-project deep does not make this any worse than single-project deep on a similarly-sized monorepo.
- **Override registry across N projects** has subtle semantics that compound in deep mode: the override prompt fires once per matched entry; the chosen action applies to every affected project. If the user picks `run-override` for Storybook spanning 4 projects, the Storybook upgrade command runs in each project sequentially with no opportunity to skip mid-loop. → Mitigation: the prompt copy already lists all affected projects so the user sees the blast radius; stop-on-fail aborts the run on the first failing override. Same posture as the shallow orchestrator.
- **Plan dir growth.** Cross-project deep plan dirs are slightly bigger than single-project plans (`scan-by-project.json` × N + `cross-project-plan.json`). The workflow's 10-day stale-cleanup already covers this; user's `~/.claude/experiments/plans/` may grow proportionally to invocation frequency. → Mitigation: phase 0 stale-cleanup runs every invocation, prompting the user to bulk-delete. No new behavior beyond what already exists.
- **Bumps applied but improvements rejected leaves the user with bumps applied without the research benefit.** Same posture as single-project deep-patch — bumps are preserved on plan-mode rejection. → Mitigation: the rejection message points the user to `git diff` per project; the user can also re-run if they want another pass at improvements (subject to changelog freshness).
- **No tests.** Same posture as the rest of the experiments plugin. → Mitigation: the manual verification matrix in `tasks.md` covers single project, multi-project, missing path, scan-failed, conflict policy paths, override paths, cancel paths, and plan-mode rejection paths.
- **Registry drift mid-run.** Theoretically a user could `commander-add` or `commander-delete` between scan dispatch and apply. The orchestrator reads the registry exactly once at resolution time and operates on the captured in-memory set; mid-run mutations have no effect. Inherited from shallow. → No additional mitigation needed.

## Migration Plan

- No registry schema change; no migration needed. Schema stays at v2.
- Both modified skills (`commander-update-orchestrator`, `parallel-research-workflow`) accept the new optional inputs with backward-compatible defaults. Existing call sites are byte-equivalent to today.
- Plugin version bump (experiments) follows the release-please flow already adopted in [MON-194](https://linear.app/monolab/issue/MON-194). The `feat(experiments): /experiments:commander-update-deep-patch command (MON-199)` commit message will drive the version bump on the next release-please PR; no manual edits to `plugin.json` / `package.json` / `marketplace.json`.
- Branch: `feature/MON-199-commander-update-patch-deep` (already checked out).
- Single PR. No staged rollout. New deep command is opt-in by definition (separate slash command); the shallow `commander-update-patch` is unaffected.

## Open Questions

_None._

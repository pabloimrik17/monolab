---
description: Scan, fetch every major changelog in parallel, research breaking changes/migration + improvements against this codebase, partition into PR-sized buckets, then drive a user-gated apply step (optionally per-bucket worktrees). Major level only. No tests/lint/build/commits.
---

# npm-update-deep-major

The "deep" sibling of `/experiments:npm-update-major`. Same scope (major-level, manifest bumps + one install), but with research weighted toward breaking changes: every changelog is fetched in parallel by subagents who cross-reference it against this codebase — capturing **breaking changes & migration steps** as first-class findings alongside improvements and workarounds — then the main agent enters plan mode and synthesizes a single integrated plan. After research, the accepted set is partitioned into PR-sized buckets (`partition-breaking-changes`) and, optionally, each bucket is applied into its own worktree. The deep single-project sibling of `/experiments:npm-update-deep-minor` — same flow, plus the major-only breaking-change weighting, PR plan, and per-bucket isolation.

> **Major updates may include breaking changes.** This command bumps + installs, and (on `apply-all`) applies reviewed migration edits via plan mode. It never commits or PRs.

This command operates exclusively at **major level**. It always passes `level=major` to the scan skill and to `parallel-research-workflow`, and ignores any user-supplied level argument.

> Tip: this command **never runs tests, lint, build, or commits**. It bumps manifests, runs a single install at most, and may apply reviewed migration/improvement edits. The summary recommends test/lint/commit as next steps; the caller decides.

## Step 1 — Scan

Invoke the `experiments:scan-npm-updates` skill with `level=major`. Parse the JSON result into a `ScanResult` value with shape:

```ts
{
    packageManager: "pnpm" | "npm" | "yarn" | "bun" | "deno",
    repoType: "single" | "workspace",
    updates: Array<{ name, currentVersion, targetVersion, location, sourceFile, skippedByReleaseAge? }>,
    warnings: string[]
}
```

If the skill aborts (any of its four preconditions), surface the scan error verbatim and exit. Do not create a plan directory.

## Step 2 — Empty-result short-circuit

If `updates.length === 0`:

1. If `warnings.length > 0`, print every warning under the heading `Warnings:` as a `-` bullet list.
2. Print exactly:

    ```text
    No major updates available.
    ```

3. Exit. Do NOT invoke grouping. Do NOT invoke the research workflow. Do NOT create a plan directory.

## Step 3 — Group

Invoke the `dependency-grouping-strategy` capability — implemented by the `group-packages-for-research` skill — passing an object input `{ updates: ScanResult.updates }` (and `maxPerGroup` only when explicitly overridden). Capture the resulting JSON:

```ts
{
    groups: Array<{ groupId, bucketKey, packages: [...] }>,
    warnings: string[]
}
```

Append the grouping skill's `warnings` to a running list for surfacing at summary time. Do NOT modify the `ScanResult` itself; the workflow needs it verbatim in Step 4.

## Step 4 — Dispatch the parallel research workflow

Invoke the `parallel-research-workflow` skill with input `{ groups, level: "major", scanResult }` (the `scanResult` here is the original `ScanResult` from Step 1, unchanged), single-project mode.

The workflow handles, in order, all of:

- Phase 0 — stale-plan cleanup prompt (`delete-stale` / `keep-stale` / `cancel`).
- Plan-dir creation under `~/.claude/experiments/plans/<slug>-major-<unix-ts>/`, with `scan.json` + global `_meta.json` written.
- Phase 1 — parallel changelog fetch (one subagent per group, each invoking `experiments:npm-changelog` per package).
- Phase 2 — parallel codebase research (the same subagents continue, writing `research.md` per group, with the major-only `### Breaking changes & migration` heading per package).
- Phase 3 — integrity verification (`retry-failed` / `continue-without` / `abort` only fires if any group is non-healthy).
- Phase 4 — plan-mode synthesis: the main agent enters plan mode and writes `plan.md` at the plan-dir root, with the major section ordering (`## Breaking changes & migration` → `## Improvements (applicable to this codebase)` → `## Workarounds resolved` → `## Skipped or unavailable` → `## Major bump set` → `## Changelogs`).

Surface progress messages emitted by the workflow as they are produced. The command SHALL NOT advance the workflow's phases on its behalf, and SHALL NOT dispatch subagents itself — the workflow is fully responsible for the orchestration above. The command's only responsibility during Step 4 is to wait for the workflow to finish.

Early-exit handling:

- If the user picked `cancel` in Phase 0 (stale-cleanup), the workflow exits before any plan dir is created. The command prints a short reasoned summary (`Cancelled by stale-cleanup. No files modified.`) and exits without reaching Step 8 — there is nothing to clean up.
- If the user picked `abort` in Phase 1 (hard-wall) or Phase 3 (integrity), the workflow returns with the plan dir preserved. The command prints a short reasoned summary (`Aborted at hard-wall. No files modified.` for Phase 1; `Aborted on integrity check. No files modified.` for Phase 3), skips Steps 4.5–7 and goes directly to Step 8.

## Step 4.5 — Partition into a PR plan (`partition-breaking-changes`)

When the workflow returns successfully (`plan.md` exists), invoke the `partition-breaking-changes` skill with:

- `bumpSet` — every row of `plan.md`'s `## Major bump set` table (`{ name, from, to, location }`).
- `breakingFindings` — the per-package `### Breaking changes & migration` items parsed from each healthy `research.md` (and aggregated in `plan.md`'s `## Breaking changes & migration`), including any codemod mentions.
- `depGraph` — a dependency-graph read the command gathers (manifest `peerDependencies` + an import-site grep for blast radius).
- `overrideFamilies` — the shipped registry families (for seeding hard co-upgrade sets); the deep path does NOT run overrides, but the families still seed co-upgrade grouping.
- `policy` — defaults (`isolateHighRisk: true`, `batchLowRisk: true`).

Append the returned buckets + count-by-policy summary to the surfaced plan as a `## PR plan` section (after `## Major bump set`). The plan the command surfaces therefore carries `## Breaking changes & migration`, `## Major bump set`, `## PR plan`, and `## Changelogs`.

## Step 5 — Execution prompt

Prompt the user via `AskUserQuestion`:

- **Question**: `Plan synthesized. <plan-dir>/plan.md is ready (incl. ## Breaking changes & migration and ## PR plan). Major updates may include breaking changes. How do you want to proceed?`
- **Multi-select**: `false`
- **Options** (in this exact order):
    - `apply-all` — execute every item in the plan: bump every package in the `Major bump set` table AND apply every applicable bullet in `Improvements (applicable to this codebase)` **and** `Breaking changes & migration` via plan mode.
    - `apply-bumps-only` — bump every package in the `Major bump set` table; skip improvements and migration edits entirely.
    - `pick-subset` — accept a free-form list of plan items (specific improvements/migration items + specific bumps) to apply.
    - `cancel` — exit without modifying any file. Plan dir is preserved on disk pending the cleanup prompt.

The command SHALL show this prompt exactly once per invocation. The command SHALL NOT auto-apply any plan item without an explicit option selection.

## Step 5.5 — Isolation gate (opt-in, default `none`)

Before applying, offer isolation via **AskUserQuestion**:

- **Question**: `Isolate before applying? Per the ## PR plan there are <N> bucket(s).`
- **Multi-select**: `false`
- **Options**:
    - `none` — "Apply every accepted bucket in the current working tree (default; the PR plan stays advisory)."
    - `per-bucket-worktree` — "For each bucket, create a worktree via `update-isolation` and apply that bucket's bumps + migration edits there. Current checkout untouched."

When `none`, all accepted buckets apply in the current tree (Step 6 runs once over the whole accepted set). When `per-bucket-worktree`, Step 6 runs per bucket, each in its own worktree (`update-isolation` with the bucket's `suggestedBranch`). No commit/push/PR in either case.

## Step 6 — Apply

Branch on the Step 5 option. When isolation is `per-bucket-worktree`, run the relevant sub-steps **once per bucket** in `suggestedMergeOrder`, calling `update-isolation({ projectPath: <root>, branchName: <bucket.suggestedBranch>, strategy: "auto" })` first and using its `workdir` as the apply `cwd` (and `skipInstall: true` when it reports `installAlreadyRan`). When isolation is `none`, run them once over the whole accepted set with `cwd = <root>`.

### Step 6a — `apply-all` and `apply-bumps-only` (bumps mechanism, shared)

Apply major-level bumps by invoking the **`apply-npm-updates` skill** — the single source of truth for the single-project apply mechanism (generic `ncu` `package.json` bumps, `pnpm-workspace.yaml` catalog edits, single install). The command builds the resolved spec and invokes the skill **once per bucket-or-set** with `target: "major"`; it does NOT restate the `ncu` / catalog / install recipe inline.

Build the resolved apply spec from the accepted set for this bucket-or-set (all updates for `apply-all`/`apply-bumps-only`; `ACCEPTED_BUMPS` for `pick-subset`; restricted to the bucket's packages when per-bucket):

- `packageManager` = the scan's `packageManager`. `cwd` = the resolved workdir (root or the bucket's worktree). `target` = `"major"`. `cooldown` = the value the scan resolved (omit for `pnpm`).
- `manifestBumps` — one element per distinct `package.json` `sourceFile`: `{ sourceFile, names, includeFilter }`. `apply-npm-updates` forces `--filter` on at `target: "major"` regardless of `includeFilter` (the `names` list is authoritative — no over-bump of minor/patch-only deps).
- `catalogEdits` — one element per accepted update with `sourceFile === "pnpm-workspace.yaml"`: `{ name, targetVersion }`.
- `overrideCommands` — **empty** (`[]`). The deep path consults NO override registry: the override flow stays the shallow `/experiments:npm-update-major` path's responsibility (see hard rules).
- `skipInstall` — `false` normally; `true` only when Step 5.5/`update-isolation` reported a worktrunk hook already installed in this bucket's worktree.

The skill runs `npm-check-updates@21.0.2 --target latest --removeRange --filter "<names>"` per manifest (exact-pin writes), performs the in-memory catalog edits, runs **exactly one** install at the end, streams output verbatim, and returns `{ appliedGeneric, appliedOverrides, installRan, failure }`.

On a structured `failure`, print the command-owned abort copy for the failing `step`, then stop immediately:

- `step: "ncu"` →

    ```text
    ncu --upgrade failed on {sourceFile} (exit {code}).
    Applied before this failure: {manifest paths already rewritten}.
    Re-run /experiments:npm-update-deep-major to retry the rest.
    ```

- `step: "catalog"` →

    ```text
    Failed to bump {name} in pnpm-workspace.yaml: {reason}.
    Applied so far: {names already written on disk}.
    Re-run /experiments:npm-update-deep-major to retry the rest.
    ```

- `step: "install"` →

    ```text
    Install failed ({pm} exit {code}). Manifests are already bumped; review changes before retrying.
    ```

For `apply-bumps-only`: stop here, jump to Step 7. Improvements and migration edits are skipped entirely.

### Step 6b — `apply-all` (improvements + breaking-change/migration via plan mode)

After the bumps install completes successfully (per bucket-or-set), the command SHALL apply the `Improvements (applicable to this codebase)` bullets **and** the `Breaking changes & migration` bullets from `plan.md` **via Claude Code plan mode** (not via blind edits). Breaking-change/migration items are treated as applicable edits exactly like improvements — reconnaissance → plan-mode preview → user-gated apply — so required migration edits land through the same reviewed mechanism, never silently. Concrete sequence:

1. **Reconnaissance pass.** For each improvement and breaking-change bullet (restricted to the bucket's packages when per-bucket), the main agent reads the area hints (file globs, directory hints) and the relevant files to determine the concrete edits the bullet would translate into. Bullets whose opportunity does not actually land here are flagged as `inapplicable` with a one-sentence reason.
2. **Plan-mode entry (mandatory).** The main agent invokes the `EnterPlanMode` tool with a markdown plan that lists, in order:
    - **Breaking changes & migration** edits first (these gate the upgrade): file path, brief description, before/after snippet for non-trivial edits.
    - The applicable **improvements** with their concrete edits.
    - The inapplicable bullets (both categories) with their reason.
    - A summary footer counting `applicable: <N>` and `inapplicable: <M>`.
3. **User review and approval.** Plan mode pauses until the user accepts or rejects the plan.
    - **Approved** → main agent exits plan mode and executes the listed edits via `Edit` / `Write` calls. After all edits land, continue to Step 7.
    - **Rejected** → the command SHALL print `Plan-mode round rejected. No improvement or migration edits applied; bumps are preserved.` and skip to Step 7. Bumps already applied in Step 6a are NOT reverted.

The plan-mode round SHALL NOT expand scope beyond bullets present in `plan.md`. Adjacent opportunities discovered during reconnaissance are surfaced in the Step 7 summary's `Suggested next steps`, never silently added.

The plan-mode round SHALL NOT execute tests, lint, or build. SHALL NOT create commits or PRs.

### Step 6c — `pick-subset`

Free-form selection over the improvement bullets, the breaking-change/migration bullets, and the bumps:

1. Compute `IMPROVEMENT_TITLES` = leading text of each `-` bullet under `## Improvements (applicable to this codebase)`; `MIGRATION_TITLES` = leading text of each `-` bullet under `## Breaking changes & migration`.
2. Compute `BUMP_NAMES` = unique package names from the `## Major bump set` table.
3. Ask the user (free-form message, no AskUserQuestion):

    ```text
    Enter the IDs to apply (comma-separated or one per line). Use plan-line excerpts for improvements/migration items (case-insensitive substring match), package names for bumps. Empty response cancels.
    Breaking changes & migration: {comma-separated MIGRATION_TITLES}
    Improvements: {comma-separated IMPROVEMENT_TITLES}
    Bumps: {comma-separated BUMP_NAMES}
    ```

4. Parse the response: split on commas and newlines, trim, drop empties. Result: `SELECTIONS`.
5. Empty `SELECTIONS` → equivalent to `cancel`; print `Cancelled. No files modified.` and skip to Step 7.
6. For each selection, classify it as a migration item, an improvement, or a bump (substring match for the first two, exact match for bumps). Selections matching none are surfaced as:

    ```text
    Unknown selection(s): {invalid items}.
    Valid migration items: {MIGRATION_TITLES}.
    Valid improvements: {IMPROVEMENT_TITLES}.
    Valid bumps: {BUMP_NAMES}.
    ```

    Re-prompt from step 6c.3. Repeat until all selections validate.

7. Compute `ACCEPTED_BUMPS`, `ACCEPTED_IMPROVEMENTS`, `ACCEPTED_MIGRATIONS` from the classified selections.
8. If `ACCEPTED_BUMPS` is non-empty → reuse Step 6a's bumps mechanism with `ACCEPTED_BUMPS`.
9. If `ACCEPTED_IMPROVEMENTS ∪ ACCEPTED_MIGRATIONS` is non-empty → reuse Step 6b's plan-mode mechanism with those as the in-scope bullets only.
10. If both empty after parsing → equivalent to `cancel`; print `Cancelled. No files modified.` and skip to Step 7.

Continue to Step 7 once processed.

### Step 6d — `cancel`

Print exactly:

```text
Cancelled. No files modified.
```

Skip to Step 7. The plan dir is preserved.

## Step 7 — Final summary

Print a markdown summary:

```markdown
## npm-update-deep-major summary
```

Then emit, **conditionally**, these sections (omit any whose count is zero, except `Suggested next steps` which is always present):

- `Applied buckets ({N}):` — when isolation was `per-bucket-worktree`, one line per bucket: `- {bucket.title} → {workdir} (branch: {branchName})` with `Suggested next steps:` per bucket (commit/push/`gh pr create` — NOT executed).
- `Applied bumps ({N}):` — one line per bumped package: `- {name} {currentVersion} → {targetVersion} ({location})`.
- `Applied migration edits ({N}):` — one line per breaking-change/migration bullet successfully applied: `- {bullet title} ({groupId})`.
- `Applied improvements ({N}):` — one line per improvement bullet successfully applied: `- {bullet title} ({groupId})`.
- `Skipped improvements / migration ({N}):` — one line per bullet declined under `pick-subset` or rejected at plan-mode review.
- `Skipped or unavailable groups ({N}):` — copied from `plan.md`'s `## Skipped or unavailable` section verbatim.
- `Isolation:` — `none (applied in current tree)` or `per-bucket-worktree (<N> worktrees)`.
- `Install:` — `<pm> install executed` (≥1 bump applied) or `skipped (no bumps applied)`.
- `Suggested next steps (not executed):` — always present, with:
    - `Run your test suite.`
    - `Run lint / typecheck.`
    - `Review changes (\`git diff\`) and commit per bucket/branch.`

For the `cancel` path specifically, the summary contains:

```markdown
## npm-update-deep-major summary

Cancelled. No files modified.

**Suggested next steps (not executed):**

- Run your test suite.
- Run lint / typecheck.
- Review changes (`git diff`) and commit.
```

The `plan.md` the command surfaces includes the `## Breaking changes & migration`, `## PR plan`, and `## Changelogs` sections.

## Step 8 — Cleanup

Delegate the cleanup prompt to the `parallel-research-workflow` skill (it owns the `delete-plan` / `keep-plan` choice). The command SHALL NOT prompt for cleanup itself — there is exactly one cleanup prompt per invocation.

The command invokes the workflow's cleanup exactly once at this step. This applies to every path that reaches Step 8: `abort` from Phase 1 or Phase 3, and any `apply-*` path (after Step 7's summary prints). Phase 0 `cancel` does not reach Step 8 (see Step 4).

## Hard rules

- The command SHALL NOT run tests, lint, or build at any point.
- The command SHALL NOT create git commits or open pull requests (or push). Branch/worktree isolation via `update-isolation` is permitted (Step 5.5, opt-in, default `none`).
- The command SHALL NOT modify any file when the user selects `cancel`. The plan dir under `~/.claude/experiments/plans/` is preserved until the user selects `delete-plan` at cleanup.
- The command SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- The command SHALL NOT consult the package upgrade override registry. Override flows belong to `/experiments:npm-update-major`'s shallow path; the deep path goes straight through ncu + catalog edits (`apply-npm-updates` with empty `overrideCommands`).
- The command SHALL NOT expand the plan-mode round beyond bullets present in `plan.md` (improvements + breaking-change/migration items).
- The command SHALL ignore any user-supplied `level` argument and always pass `level=major` to `scan-npm-updates` and `parallel-research-workflow`.

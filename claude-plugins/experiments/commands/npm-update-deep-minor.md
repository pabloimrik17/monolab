---
description: Scan, fetch every minor changelog in parallel, research applicable improvements/workarounds against this codebase, then drive a user-gated apply step. Minor level only. No tests/lint/build/commits.
---

# npm-update-deep-minor

The "deep" sibling of `/experiments:npm-update-minor`. Same scope (minor-level, manifest bumps + one install), but with research: every changelog is fetched in parallel by subagents who cross-reference it against this codebase, then the main agent enters plan mode and synthesizes a single integrated plan of applicable improvements + workarounds-resolved-by-upgrade, plus the bump set. The user picks what to apply. The deep single-project sibling of `/experiments:npm-update-deep-patch` — identical in flow, only the level differs.

This command operates exclusively at **minor level**. It always passes `level=minor` to the scan skill and to `parallel-research-workflow`, and ignores any user-supplied level argument.

> Tip: this command **never runs tests, lint, build, or commits**. It bumps manifests and runs a single install at most. The summary recommends those as next steps; the caller decides.

## Step 1 — Scan

Invoke the `experiments:scan-npm-updates` skill with `level=minor`. Parse the JSON result into a `ScanResult` value with shape:

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
    No minor updates available.
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

Invoke the `parallel-research-workflow` skill with input `{ groups, level: "minor", scanResult }` (the `scanResult` here is the original `ScanResult` from Step 1, unchanged), single-project mode.

The workflow handles, in order, all of:

- Phase 0 — stale-plan cleanup prompt (`delete-stale` / `keep-stale` / `cancel`).
- Plan-dir creation under `~/.claude/experiments/plans/<slug>-minor-<unix-ts>/`, with `scan.json` + global `_meta.json` written.
- Phase 1 — parallel changelog fetch (one subagent per group, each invoking `experiments:npm-changelog` per package).
- Phase 2 — parallel codebase research (the same subagents continue, writing `research.md` per group).
- Phase 3 — integrity verification (`retry-failed` / `continue-without` / `abort` only fires if any group is non-healthy).
- Phase 4 — plan-mode synthesis: the main agent enters plan mode and writes `plan.md` at the plan-dir root (with a `## Minor bump set` table and the `## Changelogs` chronology section).

Surface progress messages emitted by the workflow as they are produced. The command SHALL NOT advance the workflow's phases on its behalf, and SHALL NOT dispatch subagents itself — the workflow is fully responsible for the orchestration above. The command's only responsibility during Step 4 is to wait for the workflow to finish.

Early-exit handling:

- If the user picked `cancel` in Phase 0 (stale-cleanup), the workflow exits before any plan dir is created. The command prints a short reasoned summary (`Cancelled by stale-cleanup. No files modified.`) and exits without reaching Step 8 — there is nothing to clean up.
- If the user picked `abort` in Phase 1 (hard-wall) or Phase 3 (integrity), the workflow returns with the plan dir preserved. The command prints a short reasoned summary (`Aborted at hard-wall. No files modified.` for Phase 1; `Aborted on integrity check. No files modified.` for Phase 3), skips Steps 5–7 and goes directly to Step 8.

## Step 5 — Execution prompt

When the workflow returns successfully (i.e. `plan.md` exists at the plan-dir root), prompt the user via `AskUserQuestion`:

- **Question**: `Plan synthesized. <plan-dir>/plan.md is ready for review. How do you want to proceed?`
- **Multi-select**: `false`
- **Options** (in this exact order):
    - `apply-all` — execute every item in the plan: bump every package in the `Minor bump set` table AND apply every bullet in the `Improvements (applicable to this codebase)` section.
    - `apply-bumps-only` — bump every package in the `Minor bump set` table; skip improvements entirely. Equivalent in net effect to running the shallow `/experiments:npm-update-minor` against the same set, with no override-registry logic (see hard rules).
    - `pick-subset` — accept a free-form list of plan items (specific improvements + specific bumps) to apply.
    - `cancel` — exit without modifying any file. Plan dir is preserved on disk pending the cleanup prompt.

The command SHALL show this prompt exactly once per invocation. The command SHALL NOT auto-apply any plan item without an explicit option selection.

## Step 5.5 — Optional isolation gate (default `none`)

When the Step 5 option is an apply path (not `cancel`), offer to isolate the update in a branch/worktree (your current checkout stays untouched). Use **AskUserQuestion**:

- **Question**: `Isolate this minor update before applying?`
- **Multi-select**: `false`
- **Options** (in this exact order):
    - `none` — "Apply in the current working tree (default; no VCS action)."
    - `worktree` — "Create a branch + worktree via `update-isolation` (worktrunk-preferred); apply there. Current checkout untouched."
    - `branch` — "Create a branch in place via `update-isolation` and apply on it."

On `none`, set `APPLY_CWD = <project root>`. Otherwise invoke the `update-isolation` skill once with `{ projectPath: <project root>, branchName: "deps/minor-<YYYY-MM-DD>", strategy: <worktree → "auto"; branch → "branch"> }`, set `APPLY_CWD = <returned workdir>`, and set `skipInstall: true` if it reports `installAlreadyRan`. `update-isolation` creates the branch/worktree only — never commits, pushes, or opens a PR. On `cancel`, this step SHALL NOT run.

## Step 6 — Apply

Branch on the selected option.

### Step 6a — `apply-all` and `apply-bumps-only` (bumps mechanism, shared)

Apply minor-level bumps by invoking the **`apply-npm-updates` skill** — the single source of truth for the single-project apply mechanism (generic `ncu` `package.json` bumps, `pnpm-workspace.yaml` catalog edits, single install). The command builds the resolved spec and invokes the skill **once** with `target: "minor"`; it does NOT restate the `ncu` / catalog / install recipe inline.

Build the resolved apply spec from the accepted set (all updates for `apply-all`/`apply-bumps-only`; `ACCEPTED_BUMPS` for `pick-subset`):

- `packageManager` = the scan's `packageManager`. `cwd` = `APPLY_CWD` (Step 5.5 — the project root for `none`, else the isolation workdir). `target` = `"minor"`. `cooldown` = the value the scan resolved (omit for `pnpm`).
- `manifestBumps` — one element per distinct `package.json` `sourceFile`: `{ sourceFile, names, includeFilter }`. Set `includeFilter: true` only when this invocation's bumps for the file are a strict subset of ncu's own detected set (i.e. `pick-subset` partial inclusion); otherwise `false`.
- `catalogEdits` — one element per accepted update with `sourceFile === "pnpm-workspace.yaml"`: `{ name, targetVersion }`.
- `overrideCommands` — **empty** (`[]`). The deep path consults NO override registry: the override flow stays the shallow `/experiments:npm-update-minor` path's responsibility (see hard rules).
- `skipInstall` — `false` (the deep path always runs the single install after writing manifests), except `true` when Step 5.5's `update-isolation` reported `installAlreadyRan` for the worktree (a worktrunk hook already installed).

The skill runs `npm-check-updates@21.0.2` per manifest, performs the in-memory catalog edits, runs **exactly one** install at the end, streams `ncu`/install stdout/stderr verbatim, and returns `{ appliedGeneric, appliedOverrides, installRan, failure }`.

On a structured `failure`, print the command-owned abort copy for the failing `step`, then stop immediately (do NOT run the install or anything further):

- `step: "ncu"` →

    ```text
    ncu --upgrade failed on {sourceFile} (exit {code}).
    Applied before this failure: {manifest paths already rewritten}.
    Re-run /experiments:npm-update-deep-minor to retry the rest.
    ```

- `step: "catalog"` →

    ```text
    Failed to bump {name} in pnpm-workspace.yaml: {reason}.
    Applied so far: {names already written on disk}.
    Re-run /experiments:npm-update-deep-minor to retry the rest.
    ```

- `step: "install"` →

    ```text
    Install failed ({pm} exit {code}). Manifests are already bumped; review changes before retrying.
    ```

For `apply-bumps-only`: stop here, jump to Step 7. Improvements are skipped entirely.

### Step 6b — `apply-all` (improvements via plan mode)

After the bumps install completes successfully, the command SHALL apply the `Improvements (applicable to this codebase)` bullets from `plan.md` **via Claude Code plan mode** (not via blind edits). Concrete sequence:

1. **Reconnaissance pass.** For each improvement bullet, the main agent reads the area hints (file globs, directory hints) and the relevant files to determine the concrete edits the bullet would translate into in this specific codebase. Bullets whose opportunity does not actually land here are flagged as `inapplicable` with a one-sentence reason.
2. **Plan-mode entry (mandatory).** The main agent invokes the `EnterPlanMode` tool with a markdown plan that lists, in order:
    - The applicable improvements with the concrete edits they translate to: file path, brief description of the change, and (for non-trivial edits) the before/after snippet so the user can preview the effect.
    - The inapplicable improvements with their reason — explicitly listed so the user knows what was researched and why nothing was applied for those bullets.
    - A summary footer counting `applicable: <N>` and `inapplicable: <M>`.
3. **User review and approval.** Plan mode pauses until the user accepts or rejects the plan.
    - **Approved** → main agent exits plan mode and executes the listed edits via `Edit` / `Write` calls. After all edits land, continue to Step 7.
    - **Rejected** → the command SHALL print `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.` and skip to Step 7. Bumps already applied in Step 6a are NOT reverted.

The improvements step SHALL NOT expand scope beyond bullets present in `plan.md`. If during reconnaissance or plan-mode review the agent identifies adjacent improvements not in `plan.md`, those are surfaced as suggestions in the Step 7 summary's `Suggested next steps` list — never silently added to the plan-mode plan.

The improvements step SHALL NOT execute tests, lint, or build. SHALL NOT create commits or PRs (or push) — branch/worktree isolation is the separate Step 5.5 pre-apply step.

### Step 6c — `pick-subset`

Free-form selection over both the improvement bullets and the bumps:

1. Compute `IMPROVEMENT_TITLES` = the leading text of each `-` bullet under `## Improvements (applicable to this codebase)` in `plan.md` (one identifier per bullet; keep enough context to disambiguate).
2. Compute `BUMP_NAMES` = unique package names from the `## Minor bump set` table.
3. Ask the user (free-form message, no AskUserQuestion):

    ```text
    Enter the IDs to apply (comma-separated or one per line). Use plan-line excerpts for improvements (case-insensitive substring match), package names for bumps. Empty response cancels.
    Improvements: {comma-separated IMPROVEMENT_TITLES}
    Bumps: {comma-separated BUMP_NAMES}
    ```

4. Parse the response: split on commas and newlines, trim, drop empties. Result: `SELECTIONS`.
5. Empty `SELECTIONS` → equivalent to `cancel`; print `Cancelled. No files modified.` and skip to Step 7.
6. For each selection, classify it as either an improvement (matches an improvement bullet's title text, case-insensitive substring) or a bump (matches a `BUMP_NAMES` entry exactly). Selections matching neither are surfaced as:

    ```text
    Unknown selection(s): {invalid items}.
    Valid improvements: {IMPROVEMENT_TITLES}.
    Valid bumps: {BUMP_NAMES}.
    ```

    Re-prompt from step 6c.3. Repeat until all selections validate.

7. Compute:
    - `ACCEPTED_BUMPS = updates from scanResult whose name is in the bump-classified selections`.
    - `ACCEPTED_IMPROVEMENTS = improvement bullets whose title text matches one of the improvement-classified selections`.
    - `SKIPPED_IMPROVEMENTS = (all improvement bullets) − ACCEPTED_IMPROVEMENTS`.
8. If `ACCEPTED_BUMPS` is non-empty → reuse Step 6a's bumps mechanism (the `apply-npm-updates` invocation) with `ACCEPTED_BUMPS` instead of all updates (setting `includeFilter` on a `package.json` element when `ACCEPTED_BUMPS` for that file is a strict subset of its full bump set).
9. If `ACCEPTED_IMPROVEMENTS` is non-empty → reuse Step 6b's plan-mode mechanism with `ACCEPTED_IMPROVEMENTS` as the in-scope bullets only.
10. If both empty after parsing → equivalent to `cancel`; print `Cancelled. No files modified.` and skip to Step 7.

Continue to Step 7 once both subsets (or the relevant one) have been processed.

### Step 6d — `cancel`

Print exactly:

```text
Cancelled. No files modified.
```

Skip to Step 7. The plan dir is preserved.

## Step 7 — Final summary

Print a markdown summary:

```markdown
## npm-update-deep-minor summary
```

Then emit, **conditionally**, these sections (omit any whose count is zero, except `Suggested next steps` which is always present):

- `Applied bumps ({N}):` — one line per bumped package: `- {name} {currentVersion} → {targetVersion} ({location})`.
- `Applied improvements ({N}):` — one line per improvement bullet successfully applied: `- {bullet title} ({groupId})`.
- `Skipped improvements ({N}):` — one line per improvement bullet declined under `pick-subset`: `- {bullet title} ({groupId})`.
- `Skipped or unavailable groups ({N}):` — copied from `plan.md`'s `## Skipped or unavailable` section verbatim.
- `Isolation:` — always present: `none (applied in current tree)` or `<mode> — <workdir>` (the Step 5.5 choice).
- `Install:` — exactly one of:
    - `<pm> install executed` — when at least one bump was applied.
    - `skipped (no bumps applied)` — when the apply path produced zero bumps (e.g., `cancel`, or `pick-subset` with only improvements selected).
- `Suggested next steps (not executed):` — always present, with three bullets:
    - `Run your test suite.`
    - `Run lint / typecheck.`
    - `Review changes (\`git diff\`) and commit.`

For the `cancel` path specifically, the summary contains:

```markdown
## npm-update-deep-minor summary

Cancelled. No files modified.

**Suggested next steps (not executed):**

- Run your test suite.
- Run lint / typecheck.
- Review changes (`git diff`) and commit.
```

The `plan.md` the command surfaces includes the `## Changelogs` chronology section produced by `parallel-research-workflow`.

## Step 8 — Cleanup

Delegate the cleanup prompt to the `parallel-research-workflow` skill (it owns the `delete-plan` / `keep-plan` choice). The command SHALL NOT prompt for cleanup itself — there is exactly one cleanup prompt per invocation.

The command invokes the workflow's cleanup exactly once at this step. The workflow then prompts the user (`delete-plan` / `keep-plan`) and acts on the choice before returning. This applies to every path that reaches Step 8: `abort` from Phase 1 or Phase 3, and any `apply-*` path (after Step 7's summary prints). Phase 0 `cancel` does not reach Step 8 (see Step 4).

## Hard rules

- The command SHALL NOT run tests, lint, or build at any point.
- The command SHALL NOT create git commits or open pull requests (or push). Branch/worktree isolation via `update-isolation` is permitted (Step 5.5, opt-in, default `none`).
- The command SHALL NOT modify any file when the user selects `cancel`. The plan dir under `~/.claude/experiments/plans/` is preserved (it is not part of the workspace) until the user selects `delete-plan` at cleanup.
- The command SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- The command SHALL NOT consult the package upgrade override registry. Override flows (Storybook, etc.) belong to `/experiments:npm-update-minor`'s shallow path; the deep path goes straight through ncu + catalog edits (`apply-npm-updates` with empty `overrideCommands`). (The plan can mention overridable family upgrades as improvements; the user then picks whether to apply them via the standard mechanism.)
- The command SHALL ignore any user-supplied `level` argument and always pass `level=minor` to `scan-npm-updates` and `parallel-research-workflow`.

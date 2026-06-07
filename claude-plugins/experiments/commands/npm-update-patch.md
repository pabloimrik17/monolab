---
description: Scan and interactively apply npm patch-level updates across a workspace or single repo (bump + install only, no tests/commits).
---

# npm-update-patch

Scan the current project for **patch-level** dependency updates, present them to the user, and apply the accepted subset. Project-agnostic: works on pnpm/npm/yarn/bun/deno, single-repo or workspace, and treats pnpm `catalog:` entries as first-class.

The command **only bumps manifests and runs a single install**. It does NOT run tests, lint, build, or create commits — that is explicitly out of scope. The final summary suggests those as next steps; the caller decides.

> Tip: if you want to read a dep's changelog before accepting, use `/experiments:npm-changelog <pkg> <from>..<to>` as a natural pre-step.

## Step 1 — Scan

Invoke the `experiments:scan-npm-updates` skill with `level=patch`. Parse the JSON result into a `ScanResult` value with shape:

```ts
{
  packageManager: "pnpm"|"npm"|"yarn"|"bun"|"deno",
  repoType: "single"|"workspace",
  updates: Array<{ name, currentVersion, targetVersion, location, sourceFile, skippedByReleaseAge? }>,
  warnings: string[]
}
```

If the skill aborts (any of its four preconditions), surface its error message verbatim and stop.

## Step 2 — Handle empty results

If `updates.length === 0`:

1. Print any non-empty `warnings` as a single bullet list under the heading `Warnings:`.
2. Print exactly:

    ```text
    No patch updates available.
    ```

3. Exit without prompting.

## Step 3 — Render the table

If `updates.length > 0`, render a markdown table to the user:

```markdown
| name | current → target | location |
| ---- | ---------------- | -------- |
| ...  | ...              | ...      |
```

- Sort rows by `location`, then `name` (stable).
- For each row:
    - `name` → the package name.
    - `current → target` → `"{currentVersion} → {targetVersion}"`; append `(release-age fallback)` when `skippedByReleaseAge === true`.
    - `location` → the raw `location` string (`root`, `workspace:@scope/foo`, `catalog:default`, ...).
- Immediately after the table, print each warning in `warnings` as a `-` bullet under a `Warnings:` heading.

## Step 4 — Primary prompt

Use **AskUserQuestion** with one question:

- **Question**: `Apply patch updates?`
- **Multi-select**: `false`
- **Options**:
    - `apply-all` — "Bump every listed update and run a single install."
    - `pick-subset` — "Bump all updates except a set you exclude by name."
    - `cancel` — "Exit without modifying any file."

Branch on the selected option.

## Step 5a — `apply-all`

Let `ACCEPTED = updates`. Proceed to Step 6.

## Step 5b — `pick-subset`

1. Compute `VALID_NAMES = unique names in updates`.
2. Ask the user (free-form message, no AskUserQuestion):

    ```text
    Enter package names to exclude (comma-separated or one per line). Empty response means exclude none.
    Valid names: {comma-separated VALID_NAMES}
    ```

3. Parse the response by splitting on commas and newlines, trimming whitespace, and removing empty tokens. Result: `EXCLUDED`.
4. If `EXCLUDED === []` → treat as `apply-all` (let `ACCEPTED = updates`, proceed to Step 6).
5. Validate that every name in `EXCLUDED` is in `VALID_NAMES`. If any are not:
    - Print: `Unknown package name(s): {invalid names}. Valid names: {VALID_NAMES}.`
    - Re-prompt from step 5b.2. Repeat until input validates.
6. Let `ACCEPTED = updates where name is not in EXCLUDED`. Let `SKIPPED = updates where name is in EXCLUDED`.
7. If `ACCEPTED.length === 0` → print `All updates excluded; nothing to apply.` and exit without touching files.
8. Otherwise proceed to Step 6.

## Step 5c — `cancel`

Print exactly:

```text
Cancelled. No files modified.
```

Exit without touching files.

## Step 5.5 — Package Upgrade Override Registry

Before touching any manifest, consult the override registry so families like Storybook that ship their own upgrade command stay in sync instead of being bumped entry by entry.

This step uses the **`apply-npm-updates` override-resolution procedure** (R1–R4) for the matching and `{version}`-resolution algorithm — the command does NOT restate that algorithm inline. The interactive prompt below and the resolution scope (`ACCEPTED`, single-project) stay command-owned.

### Resolve matches via the procedure (R1–R3)

Invoke the procedure against `ACCEPTED`, loading the registry from `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`:

- **R1 (load)** — on a missing/unparseable registry the procedure prints `Override registry unavailable: {reason}. Proceeding without overrides.` and treats it as empty (no abort).
- **R2 (first-win glob match)** — builds `MATCHED_BY_ENTRY = { entry.id → [updates bound to this entry] }`. If empty, skip to Step 6 without prompting.
- **R3 (resolve + interpolate)** — resolves `{version}` (`target-of:` / `max-target-of:` / `latest` + `fallbackVersionSource`) against `ACCEPTED` and interpolates `command`. On an unresolvable entry the procedure prints `Cannot resolve {version} for override {id}: …` and drops the entry so its packages rejoin the generic flow.

### Prompt the user (one AskUserQuestion per matched entry)

For each remaining entry in `MATCHED_BY_ENTRY` (preserve declaration order):

- **Question** (verbatim, substituting fields):

    ```text
    Override detected for {entry.id}. {entry.notes}
    Matched packages: {comma-separated names}.
    Suggested command: {interpolated command}.
    {entry.reference ? "Reference: <url>" : ""}
    How do you want to handle this family?
    ```

- **Multi-select**: `false`
- **Options**:
    - `run-override` — "Execute the suggested command once; skip generic ncu bump for these packages."
    - `skip-matched` — "Leave these packages untouched; do not run the override and do not bump them generically."
    - `force-generic` — "Ignore the override and bump these packages with the generic ncu flow."

Record the chosen action per entry into a `OVERRIDE_ACTIONS: Map<entry.id, "run-override"|"skip-matched"|"force-generic">` structure along with the interpolated command.

### Partition for Step 6 (procedure R4)

Apply the procedure's R4 partition over `ACCEPTED` using the chosen actions:

- `OVERRIDE_RUN = { updates bound to an entry whose action is run-override }` — handled by running the override command; excluded from ncu.
- `OVERRIDE_SKIP = { updates bound to an entry whose action is skip-matched }` — excluded from everything.
- `GENERIC = ACCEPTED − OVERRIDE_RUN − OVERRIDE_SKIP` — includes every update that did not bind to any entry PLUS every update bound to a `force-generic` entry.

If every update in `ACCEPTED` falls under `OVERRIDE_SKIP` and `OVERRIDE_RUN` is also empty, print `All accepted updates were skipped by override policy. Nothing to apply.` and exit without touching files.

## Step 5.6 — Optional isolation gate (default `none`)

Before applying, offer to isolate the update in a branch/worktree (your current checkout stays untouched). Use **AskUserQuestion**:

- **Question**: `Isolate this patch update before applying?`
- **Multi-select**: `false`
- **Options** (in this exact order):
    - `none` — "Apply in the current working tree (default; no VCS action)."
    - `worktree` — "Create a branch + worktree via `update-isolation` (worktrunk-preferred); apply there. Current checkout untouched."
    - `branch` — "Create a branch in place via `update-isolation` and apply on it."

On `none`, set `APPLY_CWD = <project root>`. Otherwise invoke the `update-isolation` skill once with `{ projectPath: <project root>, branchName: "deps/patch-<YYYY-MM-DD>", strategy: <worktree → "auto"; branch → "branch"> }`, set `APPLY_CWD = <returned workdir>`, and set `skipInstall: true` if it reports `installAlreadyRan`. `update-isolation` creates the branch/worktree only — never commits, pushes, or opens a PR.

## Step 6 — Build the apply spec and invoke `apply-npm-updates`

The `apply-npm-updates` skill is the single source of truth for the mechanical apply (generic `ncu` bumps, catalog edits, override commands, single install). The command builds the resolved spec and invokes it **once** with `target: patch`; it does NOT restate the `ncu` / catalog / install recipe inline.

### Build the resolved apply spec

From the partition computed in Step 5.5:

- `packageManager` = the scan's `packageManager`. `cwd` = `APPLY_CWD` (Step 5.6 — the project root for `none`, else the isolation workdir). `target` = `"patch"`.
- `cooldown` = the release-age period the scan resolved (omit for `pnpm`).
- `manifestBumps` — one element per distinct `GENERIC` `package.json` `sourceFile`: `{ sourceFile, names: <GENERIC names for this file>, includeFilter }`. Set `includeFilter: true` when the GENERIC set for the file is a strict subset of ncu's detectable candidates — i.e. the primary prompt was `pick-subset` with at least one exclusion, OR any update for this file was removed by `OVERRIDE_RUN`/`OVERRIDE_SKIP`. Otherwise `includeFilter: false` (full-set apply; ncu's own set equals the target set).
- `catalogEdits` — one element per `GENERIC` update with `sourceFile === "pnpm-workspace.yaml"`: `{ name, targetVersion }`.
- `overrideCommands` — the `OVERRIDE_RUN` entries as `{ id, command: <interpolated command> }`, in declaration order.
- `skipInstall` — `true` when `OVERRIDE_RUN` is non-empty, `OVERRIDE_SKIP`/`GENERIC` produce no write (every accepted update handled by `run-override` and nothing written outside the override commands); **also `true` when Step 5.6's `update-isolation` reported `installAlreadyRan`** (a worktrunk `post-start` hook already installed); otherwise `false`.

### Invoke and handle the result

Invoke `apply-npm-updates` once with the spec. The skill streams `ncu` / install / override stdout/stderr verbatim and returns `{ appliedGeneric, appliedOverrides, installRan, failure }`.

On a structured `failure`, print the canonical abort copy for the failing `step` (this copy is command-owned), then stop without running anything further:

- `step: "ncu"` →

    ```text
    ncu --upgrade failed on {sourceFile} (exit {code}).
    Applied before this failure: {manifest paths already rewritten}.
    Re-run /experiments:npm-update-patch to retry the rest.
    ```

- `step: "catalog"` →

    ```text
    Failed to bump {name} in pnpm-workspace.yaml: {reason}.
    Applied so far: {names already written on disk}.
    Re-run /experiments:npm-update-patch to retry the rest.
    ```

- `step: "override"` →

    ```text
    Override command failed ({entry.id}, exit {code}): {interpolated command}.
    Generic bumps already written to disk: {manifest paths}.
    Override-executed before this failure: {entry ids}.
    Review changes and retry.
    ```

- `step: "install"` →

    ```text
    Install failed ({pm} exit {code}). Manifests are already bumped; review changes before retrying.
    ```

On success, proceed to Step 8 with the returned result fragment.

## Step 8 — Summary

Compose the summary from the `apply-npm-updates` result fragment (Step 6) — `{Ng}` = `appliedGeneric.length`, `{No}` = `appliedOverrides.length`, the `Install:` line from `installRan` — plus the command-owned skip sets (`{Ns_o}` = `OVERRIDE_SKIP`, `{Ns_u}` = user-excluded). After a successful apply, print:

```markdown
## npm-update-patch summary

**Applied generically via ncu ({Ng}):**

- {name} {currentVersion} → {targetVersion} ({location})
- ...

**Applied via override ({No}):**

- {entry.id}: {interpolated command} — matched {comma-separated names}
- ...

**Skipped by override policy ({Ns_o}):**

- {name} ({entry.id})
- ...

**Skipped by user ({Ns_u}):**

- {name} (excluded by user)
- ...

**Isolation:** {"none (applied in current tree)" | "<mode> — <workdir>"}

**Install:** {"<pm> install executed" | "skipped (overrides handled install)" | "skipped (isolation already ran install)"}

**Suggested next steps (not executed):**

- Run your test suite.
- Run lint / typecheck.
- Review changes (`git diff`) and commit.
```

- Omit any block whose count is zero (except `Suggested next steps`, which is always present). The `Isolation:` line is always present.
- When `{Ng}` is non-zero, list each update with its original `location`.
- When `{No}` is non-zero, list each override entry with the command that ran and the matched names (surface enough information that the user can re-invoke the override manually if needed).
- Do not run any of the suggested steps. This is a hard rule.

## Hard rules

- Never run tests, lint, or build.
- Never create commits or PRs (or push). Branch/worktree isolation via `update-isolation` is allowed (Step 5.6, opt-in, default `none`).
- Never modify files on `cancel` or when every accepted update is skipped by override policy.
- Never mutate a consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- Never auto-execute an override command without the user selecting `run-override` explicitly for that entry.
- Never run `ncu --upgrade` as a fallback after an override command fails.

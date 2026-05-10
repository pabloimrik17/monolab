---
name: commander-update-orchestrator
description: Use when a Commander update command (`/experiments:commander-update-patch` and the future `-minor` / `-major` / `-engines` siblings, plus the deep variants) needs to apply npm dependency updates across every project registered in the user-scoped Commander registry. Owns the cross-project pipeline — list+filter projects, parallel scan dispatch, deduplicate updates, version-align (max-wins with per-project fallback), render unified plan, sequential apply with stop-on-fail, aggregated summary. Read-only against the registry; writes go to each project's own manifests via `ncu --upgrade` and one `<pm> install` per project. Never runs tests, lint, build, or commits.
---

# commander-update-orchestrator

Cross-project npm-update orchestration. Parameterized by `level` / `target`, so every `commander:update-*` command (and the deep variants) drops into the same plumbing without re-implementing fan-out / fan-in.

## When to use

- Invoked by `/experiments:commander-update-patch` (this change) with `level=patch`, `target=patch`.
- Invoked by future `commander-update-{minor,major,engines}` commands with the matching `level`/`target`.
- Composed by future `commander-update-deep-*` commands together with the `parallel-research-workflow` skill.

Never invoke directly from the user side. The skill is meant for command-layer composition.

## Inputs

| Field                  | Type       | Required | Notes                                                                                                                                                     |
| ---------------------- | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `level`                | `string`   | yes      | One of `patch`, `minor`, `major`, `engines`. Passed verbatim to `experiments:scan-npm-updates`.                                                           |
| `target`               | `string`   | yes      | One of `patch`, `minor`, `major`, `engines`. Passed verbatim to `ncu --target`. Matches `level` for the four shipped commands.                            |
| `overrideRegistryPath` | `string`   | no       | Repo-relative path to a `pkg-upgrade-overrides.yaml` file. Default: `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`. |
| `projectsFilter`       | `string[]` | no       | Project `name`s to operate on. When set, the project picker is skipped. When unset, the multi-select picker is raised (Step 3).                           |

### Input validation

Reject before any side effect:

- Unknown `level`: abort with `Error: invalid level "<value>". Expected patch|minor|major|engines.`
- Unknown `target`: abort with `Error: invalid target "<value>". Expected patch|minor|major|engines.`

## Registry contract (read-only excerpt)

This skill reads the user-scoped Commander registry. The full contract is in [`commander-add.md`](../../commands/commander-add.md). Relevant invariants repeated here so this file is self-contained — no shared sidecar yet (extraction deferred until the third commander consumer requires it).

### Path

`<HOME>/.claude/commander/projects.json` — `<HOME>` resolves to `$HOME` on POSIX and `%USERPROFILE%` on Windows.

### Lazy create — read MUST NOT touch disk

A missing file MUST be treated as an empty registry. The skill MUST NOT create the directory or the file. The on-disk state is byte-identical before and after every run (verifiable via `shasum`).

### Schema (v2)

```json
{
    "version": 2,
    "projects": {
        "<name>": {
            "name": "...",
            "path": "...",
            "keywords": ["..."],
            "description": "...",
            "createdAt": "<ISO-8601 UTC>",
            "updatedAt": "<ISO-8601 UTC>",
            "repoType": "single-repo | monorepo | multi-monorepo",
            "specialRules": ["..."],
            "monorepoRoot": "..."
        }
    }
}
```

`repoType`, `specialRules`, and `monorepoRoot` MAY be absent on legacy v1 records. The skill consumes only `name` and `path` for routing — `repoType` is informational.

### Version gate

- `version <= 2` → read normally.
- `version > 2` → abort with `unsupported registry version: <n>` and exit non-zero. Do NOT touch the file.

---

## Step 1 — Validate inputs

Apply the input validation listed above. If validation fails, abort with the exact error string and perform no scan or apply.

## Step 2 — Resolve projects from the registry

1. Resolve `REGISTRY_PATH` = `<HOME>/.claude/commander/projects.json`.
2. Probe with `Bash test -f "<REGISTRY_PATH>"`.
    - If missing: print exactly `No projects registered. Use /experiments:commander-add to register one.` and exit `0`. Do NOT create the directory or the file.
3. `Read` the file and JSON-parse the contents.
    - On parse failure: print `registry file is not valid JSON`, exit non-zero, do NOT touch the file.
4. Inspect `version`:
    - If `version > 2`: print `unsupported registry version: <n>`, exit non-zero, do NOT touch the file.
5. Inspect `projects`:
    - If absent, `null`, or an empty object: print `No projects registered. Use /experiments:commander-add to register one.` and exit `0`.
6. Iterate `projects` in JSON insertion order. Build the candidate list `RESOLVED = [{ name, path, repoType? }, ...]` preserving that order.

### 2.1 Apply `projectsFilter` (when provided)

- Compute `MATCHED = RESOLVED ∩ projectsFilter` by `name`.
- For each name in `projectsFilter` not present in `RESOLVED`, print one line: `Filter name not found: <name>`.
- Replace `RESOLVED ← MATCHED`.
- If `RESOLVED` is empty after the filter: print `No projects matched the filter.` and exit `0`.

### 2.2 Detect missing-path drift

For each record retained, run `Bash test -d "<record.path>"`. If exit is non-zero:

- Append `{ name, path }` to a `pathMissing[]` buffer.
- Drop the record from `RESOLVED`.

The skill SHALL NOT abort on missing paths. The aggregated summary lists every dropped record under `Skipped (path missing) (<N>):`.

### 2.3 Pass-through legacy v1 records

Records lacking `repoType` are kept as-is. Do NOT synthesize the field, do NOT abort, do NOT mutate the registry.

### 2.4 Empty-after-resolution exit

If `RESOLVED` is empty after Step 2.2 (every retained record has a missing path), print:

- `No projects registered. Use /experiments:commander-add to register one.` — when the registry was empty initially (the empty-registry / empty-`projects`-object branches in Step 2 already exited there; this branch is effectively dead unless Step 2.2 emptied a non-empty list).
- Otherwise, print `No selectable projects after path-drift filtering.` followed by every `pathMissing[]` entry as a `- <name> — <path>` bullet, and exit `0`.

## Step 3 — Project subset selection (skipped when `projectsFilter` is set)

When `projectsFilter` is provided, skip this step entirely — the resolved set is already final.

When `projectsFilter` is unset and `RESOLVED` is non-empty, raise exactly **one** `AskUserQuestion` call configured as:

- `multiSelect: true`
- One option per project, label = `<name> — <path>`, description = a short hint (e.g., `repoType: <value>` when present, else `legacy v1 record`).
- A final `all` option, label = `All registered projects (<N>)` where `<N>` = `RESOLVED.length`.

### Selection handling

- Selecting `all` is equivalent to selecting every individual project.
- Selecting zero options → print `No projects selected. Cancelled.` and exit `0` with no scan or apply.
- Otherwise, set `RESOLVED ← <selected subset>` (preserving registry insertion order, NOT the order the user clicked).

## Step 4 — Parallel scan dispatch

For the resolved project set, send a **single message** containing N `Agent` tool-uses (one per project). Each agent call:

- `model: "haiku"` — latency-optimized; the agent only produces a small JSON blob.
- `subagent_type: "general-purpose"`.
- `description`: short, e.g. `commander scan: <name>`.
- `prompt` (verbatim, substituting `<level>` and `<path>`):

    ````text
    You are scanning a single project for npm dependency updates as part of a cross-project Commander run.

    PROJECT_PATH: <absolute path from the resolved record>

    Tasks:

    1. Change working directory to PROJECT_PATH.
    2. Invoke the `experiments:scan-npm-updates` skill with `level: <level>`.
    3. Return the resulting `ScanResult` JSON verbatim.

    CRITICAL OUTPUT FORMAT: your entire response MUST be a single JSON object (the `ScanResult`). No markdown fences (no ```json). No prose before or after. No explanations. The first character of your response MUST be `{` and the last character MUST be `}`. Nothing else.

    If the skill aborts on a precondition error (no package manager detected, no manifest, etc.), your entire response MUST be a single JSON object of the shape:

    {"_error": "<the precondition error string>"}

    Do NOT attempt to recover. Do NOT modify any file. Do NOT run any package-manager command outside what `scan-npm-updates` itself runs.
    ````

### 4.1 Per-agent CWD

The `Agent` tool-call MUST configure the agent's working directory at `<record.path>` so `scan-npm-updates` detects the project's local package manager (pnpm/npm/yarn/bun/deno) without drift.

### 4.2 Parse responses

Collect each agent's response and parse it as JSON:

- If parse succeeds and the JSON has shape `{ packageManager, repoType, updates, warnings }`: this is a `ScanResult`. Tag with the originating project's `name`/`path`.
- If parse succeeds and the JSON has shape `{ "_error": "<string>" }`: mark the project as `scan-failed`, store the error string for the summary, and exclude the project from aggregation and apply.
- If parse fails (non-JSON or invalid JSON): same as `_error` above, with a synthesized error string `Agent response was not valid JSON`.

### 4.3 Build the per-project map

Combine successful results into `ScanResultByProject = { [projectName]: ScanResult }`. The `scanFailed[]` buffer holds `{ name, error }` for every project that failed.

The skill SHALL continue processing other projects' results normally; a failure in one project never blocks the rest.

## Step 5 — Cross-project aggregation

Aggregate `ScanResultByProject` into a `CrossProjectPlan`:

```ts
interface CrossProjectPlan {
    packages: Array<{
        name: string;
        occurrences: Array<{
            projectName: string;
            currentVersion: string;
            targetVersion: string;
            location: string;
            sourceFile: string;
            skippedByReleaseAge?: boolean;
        }>;
        proposedTarget: string; // see Step 6
        conflict: boolean; // see Step 6
    }>;
    warnings: string[]; // per-project warnings, prefixed with `<projectName>: `
    scanFailed: Array<{ name: string; error: string }>;
    pathMissing: Array<{ name: string; path: string }>;
}
```

Aggregation rules:

1. Group every `update` across every project by package `name` (case-sensitive npm name).
2. Preserve insertion order: packages appear in the order of their first occurrence across the iteration of projects (same as registry insertion order).
3. Each `occurrence` carries the full per-project context (`projectName`, `currentVersion`, `targetVersion`, `location`, `sourceFile`, `skippedByReleaseAge`).
4. Concatenate `warnings[]` across every project's `ScanResult`, prefixing each with `<projectName>:`.

## Step 6 — Version alignment

For each aggregated package, compute:

- `proposedTarget = max(occurrences[].targetVersion)` (semver max). Strip leading `^`/`~`/`=` for comparison; preserve the prefix of the highest-versioned occurrence on output.
- `conflict = true` when at least one occurrence's declared range (`currentVersion` interpreted as a range) does NOT admit `proposedTarget`. Range admission: standard semver `satisfies(proposedTarget, currentVersion)`.

If `any package.conflict === true`, raise exactly **one** `AskUserQuestion` (regardless of how many packages conflict):

- **Question copy (verbatim, substitute the package list)**:

    ```text
    Cross-project version conflict for: <comma-separated conflicting package names>.
    At least one project's declared range does not admit the proposed maximum target.
    How should the run resolve every conflicting package?
    ```

- `multiSelect: false`
- **Options**:
    - `use-max-where-possible` — Apply `proposedTarget` only to occurrences whose range admits it; non-admitting occurrences keep their per-project `targetVersion`.
    - `per-project` — Every occurrence retains its per-project `targetVersion`; no max-alignment for the conflicting packages.
    - `skip-package` — Drop every conflicting package from the run entirely (their occurrences are removed from the plan).

The chosen policy applies to **every** conflicting package in the run. Do NOT prompt per-package.

### Materialize the post-policy plan

Walk every package, applying the chosen policy to the conflicting subset:

- `use-max-where-possible`: per occurrence, set `effectiveTarget = proposedTarget` when admissible, else `effectiveTarget = occurrence.targetVersion`.
- `per-project`: per occurrence, `effectiveTarget = occurrence.targetVersion`.
- `skip-package`: drop the package; record names under `Skipped by conflict policy` for the summary.

Non-conflicting packages always set `effectiveTarget = proposedTarget` for every occurrence (range admission already proven).

## Step 7 — Render the cross-project plan

Render a single markdown table:

```markdown
| package | proposed target | projects       | locations                  |
| ------- | --------------- | -------------- | -------------------------- |
| lodash  | ^4.17.22        | proj-A, proj-B | root, workspace:@scope/foo |
| ...     | ...             | ...            | ...                        |
```

- Sort rows alphabetically by `name` (stable).
- `proposed target` reflects the post-policy `effectiveTarget`. When `use-max-where-possible` produced a split, render the per-project values with a slash separator (e.g., `^4.17.22 / ~4.17.21 (proj-B)`) and append a footnote `* per-project under conflict policy`.
- `projects` lists project names where the package will be applied (deduplicated, comma-separated, registry insertion order).
- `locations` lists the unique `location` strings across those projects (deduplicated, comma-separated).
- Append `Warnings:` heading with each warning as a `-` bullet, when `warnings[]` is non-empty.
- Append `Skipped (scan-failed) (<N>):` heading listing project names + error, when `scanFailed[]` is non-empty.
- Append `Skipped (path missing) (<N>):` heading listing `<name> — <path>` bullets, when `pathMissing[]` is non-empty.

### 7.1 Empty-plan early exit

If the post-policy plan has no apply-able packages (every package was scan-failed, path-missing, or `skip-package`-dropped):

- Print any warnings and the literal line `No <level> updates available across selected projects.`
- Exit `0` with no apply, no install, no override execution.

## Step 8 — Override registry consultation

Load the override registry from `overrideRegistryPath` (default `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`). Apply the same first-win matching logic as `npm-update-patch.md` Step 5.5.

### 8.1 Load

- `Read` the file. If missing or unparseable: print `Override registry unavailable: <reason>. Proceeding without overrides.` and treat the registry as empty. Do NOT abort.

### 8.2 Compute matches across the cross-project package set

For each package in the post-policy plan, find the first override entry whose `matches` list includes a pattern matching the package `name`. Pattern semantics (mirror `npm-update-patch.md` Step 5.5):

- `*` matches any run of characters within a package name.
- No other glob metacharacters.

Matching is **first-win**: a package binds to at most one entry. Build `MATCHED_BY_ENTRY = { entry.id → [packages bound to this entry] }`.

### 8.3 Resolve `{version}` against the cross-project aggregated `proposedTarget` set

For each entry in `MATCHED_BY_ENTRY`, resolve `versionSource`:

- `target-of:<name>` → the `proposedTarget` of the package whose `name == <name>` in the cross-project plan (prefix-stripped). If not present, source is unresolved.
- `max-target-of:<glob>` → the max semver across `proposedTarget` of packages whose `name` matches `<glob>` in the cross-project plan (prefix-stripped). If no match, source is unresolved.
- `latest` → the literal string `latest`.

If `versionSource` is unresolved and `fallbackVersionSource` is defined, try it. If both fail, emit a warning, drop this entry from `MATCHED_BY_ENTRY`, and let its matched packages rejoin the generic flow.

Interpolate the resolved version into `command` by replacing the literal token `{version}`.

### 8.4 Prompt once per matched entry across the run

For each remaining entry, raise exactly **one** `AskUserQuestion`:

- **Question copy (verbatim, substitute fields)**:

    ```text
    Override detected for {entry.id}. {entry.notes}
    Matched packages (across all projects): {comma-separated names}.
    Affected projects: {comma-separated project names where any matched package occurs}.
    Suggested command: {interpolated command}.
    {entry.reference ? "Reference: <url>" : ""}
    How do you want to handle this family across every affected project?
    ```

- `multiSelect: false`
- **Options**:
    - `run-override` — Execute the command once per affected project; skip generic ncu bump for these packages.
    - `skip-matched` — Leave these packages untouched in every project; do not run the override and do not bump generically.
    - `force-generic` — Ignore the override and bump these packages with the generic ncu flow in every affected project.

Record the chosen action per entry into `OVERRIDE_ACTIONS: Map<entry.id, "run-override"|"skip-matched"|"force-generic">` along with the interpolated command.

### 8.5 Partition for apply

Compute three disjoint subsets per package:

- `OVERRIDE_RUN` — packages bound to a `run-override` entry. The override command runs once per project that has at least one matched occurrence.
- `OVERRIDE_SKIP` — packages bound to a `skip-matched` entry. Excluded from everything.
- `GENERIC` — packages not bound to any entry, plus packages bound to a `force-generic` entry.

If every package in the post-policy plan is in `OVERRIDE_SKIP` and `OVERRIDE_RUN` is empty, print `All accepted updates were skipped by override policy. Nothing to apply.` and exit `0` without touching files. (`ACCEPTED` is defined in Step 9; this short-circuit happens before the user confirmation gate.)

## Step 9 — User confirmation gate

Raise exactly **one** `AskUserQuestion`:

- **Question copy**: `Apply <level> updates across <N> project(s)?`
- `multiSelect: false`
- **Options**:
    - `apply-all` — Proceed with the entire (post-policy, post-override) plan.
    - `pick-subset` — Accept a free-form package-name list to exclude before apply.
    - `cancel` — Exit without modifying any file.

### 9.1 `apply-all`

Let `ACCEPTED = post-policy ∖ OVERRIDE_SKIP`. Proceed to Step 10.

### 9.2 `pick-subset`

1. Compute `VALID_NAMES = unique names in the post-policy plan` (post Step 6 conflict policy), then remove names in `OVERRIDE_SKIP` (post Step 8.5) — the resulting set is what the user can validly exclude.
2. Ask the user (free-form message, no AskUserQuestion):

    ```text
    Enter package names to exclude (comma-separated or one per line). Empty response means exclude none.
    Valid names: {comma-separated VALID_NAMES}
    ```

3. Parse the response by splitting on commas and newlines, trimming whitespace, removing empty tokens. Result: `EXCLUDED`.
4. If `EXCLUDED === []` → treat as `apply-all`.
5. Validate every name in `EXCLUDED` is in `VALID_NAMES`. On any invalid:
    - Print `Unknown package name(s): {invalid names}. Valid names: {VALID_NAMES}.`
    - Re-prompt step 9.2.2.
6. Let `ACCEPTED = post-policy \ {names in EXCLUDED} \ {names in OVERRIDE_SKIP}` (set difference: drop both excluded and override-skipped packages — `OVERRIDE_SKIP` MUST NOT be re-included by `pick-subset`). Let `SKIPPED_BY_USER = EXCLUDED`.
7. If `ACCEPTED` is empty after exclusion → print `All updates excluded; nothing to apply.` and exit `0` without touching files.
8. Otherwise proceed to Step 10.

### 9.3 `cancel`

Print exactly:

```text
Cancelled. No files modified.
```

Exit `0` without touching files. Do NOT run any apply, install, or override command.

## Step 10 — Sequential apply (one project at a time, stop-on-fail)

Iterate the resolved project set in **registry insertion order** (already preserved through Steps 2–9). For each project:

### 10.1 Compute the per-project subset

Collect occurrences in `ACCEPTED` whose `projectName` matches this project. Apply:

- The chosen conflict policy (Step 6) — drop occurrences for `skip-package`-dropped packages; preserve per-project `effectiveTarget` under `per-project`; honor partition under `use-max-where-possible`.
- The override partition (Step 8.5) — drop occurrences in `OVERRIDE_SKIP`; route `OVERRIDE_RUN` packages to step 10.4; route everything else to step 10.3.
- The user exclusion (Step 9.2) — already excluded from `ACCEPTED`.

If the per-project subset is empty (no generic occurrences AND no override entries touch this project), skip apply AND install for this project. Continue to the next.

### 10.2 Set the working directory

For every Bash invocation in the apply for this project, prepend `cd "<record.path>" &&` (or use absolute paths for ncu's `--packageFile`). The skill SHALL NOT mutate the user's shell state across iterations.

### 10.3 Generic ncu apply (`GENERIC` subset for this project)

Group occurrences by `sourceFile` and distinguish two manifest kinds:

#### `package.json` files

Invoke `npm-check-updates@21.0.2` once per distinct `sourceFile`:

```bash
<runner-prefix> npm-check-updates@21.0.2 \
  -p <pm> \
  --target <target> \
  --upgrade \
  --packageFile <sourceFile> \
  [--cooldown <period>]        # mirror the value scan-npm-updates resolved for this project; omit for pnpm
  [--filter "<names>"]         # see "When to filter" below
```

Where:

- `<runner-prefix>` matches the per-project package manager (`pnpm dlx`, `npx -y`, `yarn dlx`, `bunx`, `deno run --allow-read --allow-net npm:`).
- `-p <pm>` is the project's package manager from `ScanResult.packageManager`. MUST be passed to mirror scan semantics and prevent ncu auto-detection drift.
- `--target <target>` — the orchestrator's `target` input (e.g., `patch`).
- `<names>` is the GENERIC package names for this `sourceFile`, joined by single spaces, double-quoted.

##### When to include `--filter`

- The user picked `pick-subset` and at least one package was excluded for this project, OR
- Any update for this `sourceFile` was removed by `OVERRIDE_RUN` / `OVERRIDE_SKIP` (so ncu must NOT bump packages routed elsewhere), OR
- The conflict policy is `use-max-where-possible` and ncu's full set ≠ this project's effective subset.

Otherwise omit `--filter` (ncu's own set equals the target set for this file).

##### Failure handling

Stream stdout/stderr through to the user. If ncu exits non-zero, abort the entire run with:

```text
ncu --upgrade failed on {sourceFile} ({projectName}, exit {code}).
Stopping the run. Subsequent projects not attempted.
```

Then jump to Step 11 (summary) with the run partition (applied / failed / pending).

#### `pnpm-workspace.yaml` (catalog updates)

For each occurrence with `sourceFile === "pnpm-workspace.yaml"`:

- Under the top-level `catalog:` block, locate the key matching `name`.
- Replace the value with `effectiveTarget`. Preserve surrounding whitespace, comments, and other keys' order.
- Do NOT touch any consumer `package.json` that references `catalog:`.

If a key is unexpectedly missing, abort the entire run with:

```text
Failed to bump {name} in pnpm-workspace.yaml ({projectName}): {reason}.
Stopping the run. Subsequent projects not attempted.
```

### 10.4 Override commands (`OVERRIDE_RUN` entries that touch this project)

After the generic path has written every manifest successfully for this project, execute each `OVERRIDE_RUN` entry's interpolated command **in declaration order**, exactly **once per affected project**. Stream stdout/stderr.

If any override exits non-zero, abort the entire run with:

```text
Override command failed ({entry.id}, {projectName}, exit {code}): {interpolated command}.
Stopping the run. Subsequent projects not attempted.
```

Do NOT run `ncu --upgrade` as a fallback. Do NOT run the final install for this project.

### 10.5 Install

After all generic bumps and overrides land for this project, run exactly **one** install command using this project's package manager:

| `packageManager` | Command        |
| ---------------- | -------------- |
| `pnpm`           | `pnpm install` |
| `npm`            | `npm install`  |
| `yarn`           | `yarn install` |
| `bun`            | `bun install`  |
| `deno`           | `deno install` |

**Skip the install** when:

- Every accepted package for this project went through `run-override` AND
- No generic ncu bump ran for this project AND
- No `pnpm-workspace.yaml` catalog edit happened for this project.

In that case, every override command is assumed to have handled its own install. Record this in the summary.

If the install exits non-zero, abort the entire run with:

```text
Install failed ({pm}, {projectName}, exit {code}). Manifests already bumped; review changes before retrying.
Stopping the run. Subsequent projects not attempted.
```

### 10.6 Stop-on-fail

On any failure (ncu, override, install) in any project:

- Stop iteration immediately.
- Do NOT attempt apply for subsequent projects.
- Mark the failed project with the failing step + exit code.
- Mark all unattempted projects as `pending`.
- Proceed to Step 11 (summary).

## Step 11 — Cross-project summary

Print a markdown summary. Render sections conditionally; sections with count zero SHALL be omitted, except `Suggested next steps`, which SHALL always appear.

```markdown
## commander-update-<level> summary

**Applied projects (<N>):**

- {projectName}: {bumps and overrides}
    - {name} {currentVersion} → {effectiveTarget} ({location})
    - ... per bump
    - {entry.id}: {interpolated command} — matched {comma-separated names}
    - ... per override
- ... per project

**Failed project:**

- {projectName}: failed at {step} (exit {code})
- {error message excerpt}

**Pending projects (<N>):**

- {projectName}, {projectName}, ...

**Skipped (path missing) (<N>):**

- {name} — {path}
- ...

**Skipped (scan-failed) (<N>):**

- {name}: {error}
- ...

**Skipped by user (<N>):**

- {name} (excluded by user)
- ...

**Skipped by conflict policy (<N>):**

- {name} (skip-package — affected projects: {comma-separated})
- ...

**Skipped by override (<N>):**

- {name} ({entry.id}, skip-matched)
- ...

**Warnings (<N>):**

- {projectName}: {warning text}
- ...

**Suggested next steps (not executed):**

- Run your test suite in each modified project.
- Run lint / typecheck in each modified project.
- Review changes (`git diff`) and commit per project.
```

### 11.1 Section gating

| Section                    | Render when                                                  |
| -------------------------- | ------------------------------------------------------------ |
| Applied projects           | At least one project applied successfully (full or empty).   |
| Failed project             | Stop-on-fail triggered.                                      |
| Pending projects           | Stop-on-fail triggered AND at least one project unattempted. |
| Skipped (path missing)     | `pathMissing[]` non-empty.                                   |
| Skipped (scan-failed)      | `scanFailed[]` non-empty.                                    |
| Skipped by user            | `pick-subset` excluded at least one package.                 |
| Skipped by conflict policy | `skip-package` policy chosen with at least one match.        |
| Skipped by override        | At least one override entry got `skip-matched`.              |
| Warnings                   | `warnings[]` non-empty.                                      |
| Suggested next steps       | Always.                                                      |

### 11.2 Registry-byte-identity verification (manual check)

After the run completes (success, partial, cancel), the user-scoped registry `<HOME>/.claude/commander/projects.json` MUST be byte-identical to its pre-run state. Verifiable via `shasum`. The skill itself does not perform the check (it cannot capture state pre-invocation), but the design forbids any registry write and the apply path never touches `<HOME>/.claude/commander/`.

---

## Hard rules

- The skill SHALL NOT run tests, lint, or build at any point in any project.
- The skill SHALL NOT create git commits, branches, or pull requests in any project.
- The skill SHALL NOT modify any file outside the per-project manifests it bumps. In particular, `<HOME>/.claude/commander/projects.json` SHALL remain byte-identical before and after every run.
- The skill SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- The skill SHALL NOT auto-execute an override command without the user selecting `run-override` for that entry.
- The skill SHALL NOT run `ncu --upgrade` as a fallback after an override command fails (mirrors `npm-update-patch`).

## Error messages (canonical)

- `Error: invalid level "<value>". Expected patch|minor|major|engines.` — Step 1 input validation.
- `Error: invalid target "<value>". Expected patch|minor|major|engines.` — Step 1 input validation.
- `No projects registered. Use /experiments:commander-add to register one.` — Step 2 empty registry.
- `unsupported registry version: <n>` — Step 2 version gate.
- `registry file is not valid JSON` — Step 2 parse failure.
- `Filter name not found: <name>` — Step 2.1 unmatched filter.
- `No projects matched the filter.` — Step 2.1 every filter name unmatched.
- `No selectable projects after path-drift filtering.` — Step 2.4 every retained record path-missing.
- `No projects selected. Cancelled.` — Step 3 empty multi-select.
- `Override registry unavailable: <reason>. Proceeding without overrides.` — Step 8.1 graceful degradation.
- `No <level> updates available across selected projects.` — Step 7.1 empty-plan exit.
- `All accepted updates were skipped by override policy. Nothing to apply.` — Step 8.5 every package skip-matched.
- `Unknown package name(s): {invalid names}. Valid names: {VALID_NAMES}.` — Step 9.2 invalid pick-subset.
- `All updates excluded; nothing to apply.` — Step 9.2 empty post-exclusion.
- `Cancelled. No files modified.` — Step 9.3 user cancel.
- `ncu --upgrade failed on {sourceFile} ({projectName}, exit {code}). Stopping the run. Subsequent projects not attempted.` — Step 10.3 ncu failure.
- `Failed to bump {name} in pnpm-workspace.yaml ({projectName}): {reason}. Stopping the run. Subsequent projects not attempted.` — Step 10.3 catalog failure.
- `Override command failed ({entry.id}, {projectName}, exit {code}): {interpolated command}. Stopping the run. Subsequent projects not attempted.` — Step 10.4 override failure.
- `Install failed ({pm}, {projectName}, exit {code}). Manifests already bumped; review changes before retrying. Stopping the run. Subsequent projects not attempted.` — Step 10.5 install failure.

## Non-goals (deferred)

- Per-project parallel apply — sequential by design.
- Cross-machine registry sync.
- Auto-migration of v1 records.
- Lockfile/concurrency for the registry.
- Tests — manual verification only.
- Shared `apply-npm-updates` skill extracted from `npm-update-patch.md` — deferred until the deep variants land (third consumer).
- `--projects a,b,c` CLI flag — deferred until a scripted caller appears.
- Auto-rollback of applied projects on failure — out of scope.

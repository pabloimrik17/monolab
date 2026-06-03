---
name: commander-update-orchestrator
description: Use when a Commander update command (`/experiments:commander-update-patch` and the future `-minor` / `-major` / `-engines` siblings, plus the deep variants) needs to apply npm dependency updates across every project registered in the user-scoped Commander registry. Owns the cross-project pipeline — list+filter projects, parallel scan dispatch, deduplicate updates, version-align (max-wins with per-project fallback), render unified plan, sequential apply with stop-on-fail, aggregated summary. Read-only against the registry; writes go to each project's own manifests via `ncu --upgrade` and one `<pm> install` per project. Never runs tests, lint, build, or commits.
---

# commander-update-orchestrator

Cross-project npm-update orchestration. Parameterized by `level` / `target`, so every `commander:update-*` command (and the deep variants) drops into the same plumbing without re-implementing fan-out / fan-in.

## When to use

- Invoked by `/experiments:commander-update-patch` with `level=patch`, `target=patch` (shallow mode, default).
- Invoked by `/experiments:commander-update-deep-patch` with `level=patch`, `target=patch`, `mode=deep` (deep mode, MON-199).
- Future `commander-update-{minor,major,engines}` and `commander-update-deep-{minor,major,engines}` commands wire the matching `level`/`target`/`mode` trio.
- Composes with `parallel-research-workflow` (in cross-project mode) for the deep-mode research insertion (Step 6.5).

Never invoke directly from the user side. The skill is meant for command-layer composition.

## Inputs

| Field                  | Type       | Required | Notes                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `level`                | `string`   | yes      | One of `patch`, `minor`, `major`, `engines`. Passed verbatim to `experiments:scan-npm-updates`.                                                                                                                                                                                                                           |
| `target`               | `string`   | yes      | One of `patch`, `minor`, `major`, `engines`. Passed verbatim to `ncu --target`. Matches `level` for the four shipped shallow commands and four future deep commands.                                                                                                                                                      |
| `mode`                 | `string`   | no       | One of `shallow`, `deep`. Default `shallow`. Selects the deep-research path (cross-project changelog research inserted at Step 6.5 + unified plan-mode improvements round at apply time). The shallow path is byte-equivalent across `mode: "shallow"` and an absent `mode` input. See "Mode-conditional behavior" below. |
| `overrideRegistryPath` | `string`   | no       | Repo-relative path to a `pkg-upgrade-overrides.yaml` file. Default: `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`. Identical default in both modes.                                                                                                                                |
| `projectsFilter`       | `string[]` | no       | Project `name`s to operate on. When set, the project picker is skipped. When unset, the multi-select picker is raised (Step 3).                                                                                                                                                                                           |

### Input validation

Reject before any side effect:

- Unknown `level`: abort with `Error: invalid level "<value>". Expected patch|minor|major|engines.`
- Unknown `target`: abort with `Error: invalid target "<value>". Expected patch|minor|major|engines.`
- Unknown `mode`: abort with `Error: invalid mode "<value>". Expected shallow|deep.`

### Mode-conditional behavior

This skill ships two execution paths selected by the `mode` input. The shallow path is byte-equivalent to MON-194's shipped contract; the deep path layers research + a unified plan-mode round on top.

| Step / Concern                    | `mode === "shallow"` (default)                                                                     | `mode === "deep"`                                                                                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Steps 1, 2, 3, 4, 5, 6, 8         | Identical (shared plumbing).                                                                       | Identical (shared plumbing).                                                                                                                                                     |
| Step 6.5 (cross-project research) | SHALL NOT execute. No plan-dir is created.                                                         | Fires. Composes `group-packages-for-research` + `parallel-research-workflow` (cross-project mode). Produces `<plan-dir>/plan.md`.                                                |
| Step 7 (plan rendering)           | Generates the bump-set table inline from `CrossProjectPlan`.                                       | Reads `<plan-dir>/plan.md` verbatim; appends orchestrator-owned drift sections (Warnings, scan-failed, path-missing).                                                            |
| Step 9 (gate)                     | Three options: `apply-all`, `pick-subset`, `cancel`.                                               | Four options: `apply-all`, `apply-bumps-only`, `pick-subset`, `cancel`. `pick-subset` accepts both package names AND improvement-bullet titles.                                  |
| Step 10 (apply)                   | Single per-project bumps loop (10.1–10.6).                                                         | Splits into Step 10a (bumps loop, identical to shallow), Step 10b (cross-project plan-mode round for improvements), Step 10c (end-of-flow cleanup invocation).                   |
| Step 11 (summary) H1              | `## commander-update-<level> summary`                                                              | `## commander-update-deep-<level> summary`                                                                                                                                       |
| Step 11 (summary) sections        | Shallow set (Applied / Failed / Pending / Skipped-by-{path,scan,user,policy,override} / Warnings). | Shallow set PLUS `Applied improvements`, `Skipped improvements`, `Inapplicable improvements`, `Skipped or unavailable groups`. Conditional `Review plan.md` bullet on keep-plan. |

The shallow path SHALL NOT execute Step 6.5, SHALL NOT enter plan mode at apply time, SHALL NOT invoke the workflow's end-of-flow cleanup, and SHALL NOT render deep-mode summary sections. The deep-mode insertions are local to Steps 6.5, 7, 9, 10a/10b/10c, and 11 — Steps 1, 2, 3, 4, 5, 6, and 8 behave identically across modes (in particular, Step 8 override registry consultation is shared verbatim — Decision 5 in `design.md`).

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
    - If missing: print exactly `No projects registered. Use /commander:add to register one.` and exit `0`. Do NOT create the directory or the file.
3. `Read` the file and JSON-parse the contents.
    - On parse failure: print `registry file is not valid JSON`, exit non-zero, do NOT touch the file.
4. Inspect `version`:
    - If `version > 2`: print `unsupported registry version: <n>`, exit non-zero, do NOT touch the file.
5. Inspect `projects`:
    - If absent, `null`, or an empty object: print `No projects registered. Use /commander:add to register one.` and exit `0`.
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

- `No projects registered. Use /commander:add to register one.` — when the registry was empty initially (the empty-registry / empty-`projects`-object branches in Step 2 already exited there; this branch is effectively dead unless Step 2.2 emptied a non-empty list).
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

## Step 6.5 — Cross-project research (deep mode only)

Fires only when `mode === "deep"`. Inserted between Step 6 (version alignment) and Step 7 (plan rendering). The shallow path SHALL skip this entire section.

This step composes three already-shipped skills: `experiments:group-packages-for-research`, `experiments:parallel-research-workflow` (in cross-project mode), and — indirectly through the workflow — `experiments:npm-changelog`. The orchestrator SHALL NOT advance the workflow's phases on its behalf; the workflow owns its own phase machine (0 → init → 1 → 2 → 3 → 4).

### 6.5.1 Build the deduplicated package set

Convert the post-policy `CrossProjectPlan.packages` (output of Step 6) into a `ScanResult.updates[]`-compatible array — **one record per unique package**, NOT one per occurrence:

```ts
const dedupedUpdates = postPolicyPlan.packages.map((pkg) => ({
    name: pkg.name,
    targetVersion: pkg.effectiveTarget, // post-policy resolution from Step 6
    currentVersion: mostCommonCurrentVersion(pkg.occurrences), // by occurrence count; ties broken by first-occurrence order
    location: "cross-project", // synthetic; cross-project has no single location
    sourceFile: "cross-project", // synthetic; cross-project has no single source file
}));
```

Sort the deduplicated set alphabetically by `name` (stable) — matches the Step 7 ordering shipped for the shallow rendering.

The deduplication is package-level. A package that appears in N projects produces exactly **one** `updates[]` record, not N. This is the deduplication contract MON-199 mandates: research keys off the unique package set, not off the (package, project) matrix.

Packages dropped by Step 6's `skip-package` conflict policy are NOT included in `dedupedUpdates` (they were already removed from `postPolicyPlan.packages`).

### 6.5.2 Group the deduplicated set

Invoke `experiments:group-packages-for-research` with `{ updates: dedupedUpdates }` (and `maxPerGroup` only if the caller overrode it). Capture:

- `groups: Array<{ groupId, bucketKey, packages: [...] }>` — input to the workflow.
- `warnings: string[]` — append each entry to the orchestrator's running `warnings[]` list for the Step 11 summary.

### 6.5.3 Synthesize a cross-project `scanResult`

`parallel-research-workflow` requires a `scanResult` input shaped like a `ScanResult`. Build one from the cross-project plan:

```ts
const crossProjectScan = {
    packageManager: unionPackageManager(allProjects), // see below
    repoType: "workspace", // cross-project is workspace-shaped by construction
    updates: dedupedUpdates,
    warnings: orchestratorWarnings, // the running list at this point
};
```

`unionPackageManager` rule: when every project in the resolved set shares the same package manager (every `ScanResult.packageManager` value identical across `ScanResultByProject`), use that value verbatim. Otherwise, use the literal string `"mixed"`.

When the result is `"mixed"`, append the warning `Mixed package managers across selected projects: <comma-separated unique pm list, alphabetical>.` to the orchestrator's running `warnings[]` list (surfaces in Step 11 and is persisted in `crossProjectScan.warnings`).

The workflow does NOT consume `scanResult.packageManager` for routing in cross-project mode — this field is informational only. It propagates into `<plan-dir>/scan-by-project.json` (which the orchestrator writes — see 6.5.5) for user inspection.

### 6.5.4 Invoke the workflow

Call `experiments:parallel-research-workflow` with:

```ts
{
    groups: groups,                                  // from Step 6.5.2
    level: skillInput.level,                         // e.g. "patch"
    scanResult: crossProjectScan,                    // from Step 6.5.3
    mode: "cross-project",                           // mandatory for cross-project research contract
    slugOverride: `commander-deep-${level}`,         // e.g. "commander-deep-patch" — plan-dir slug
}
```

Capture the absolute `<plan-dir>` path the workflow returns. Inside this single invocation the workflow runs:

1. Phase 0 — stale-plan cleanup (pattern `^[a-z0-9-]+-(patch|minor|major|engines)-\d+(-\d+)?$` matches cross-project plan-dirs, e.g. `commander-deep-patch-1715693231`).
2. Phase init — plan-dir creation under `~/.claude/experiments/plans/commander-deep-<level>-<unix-ts>[-N]/`.
3. Phase 1 — batched parallel changelog fetch (sequential batches of `maxConcurrent`, parallel within a batch; hard-wall fallback prompt on dispatch denial).
4. Phase 2 — parallel codebase research with the cross-project subagent prompt template (universal findings only, no codebase cross-reference).
5. Phase 3 — mandatory integrity gate (`retry-failed` / `continue-without` / `abort` if any group is non-healthy).
6. Phase 4 — plan-mode synthesis writes `<plan-dir>/plan.md` with the cross-project template.

### 6.5.5 Persist per-project scans alongside the cross-project plan

After Step 6.5.4 returns (i.e. `plan.md` exists at `<plan-dir>/plan.md`), the orchestrator SHALL write two additional artifacts under the plan-dir (the workflow's contract delegates these two files to the cross-project caller):

- `<plan-dir>/scan-by-project.json` — JSON object mapping `projectName` → the verbatim per-project `ScanResult` from Step 4 (`ScanResultByProject`).
- `<plan-dir>/cross-project-plan.json` — JSON object capturing the post-Step-6 `CrossProjectPlan` (deduplicated package list with per-occurrence projection — `projectName`, `currentVersion`, `targetVersion`, `location`, `sourceFile`, plus `proposedTarget`, `effectiveTarget` per occurrence, and the resolved conflict-policy outcome).

Both files are pretty-printed (2-space indent). The workflow itself does NOT require these files for plan-mode synthesis (it consumes `groups[]` and the synthesized `scanResult` directly through its inputs); they exist for the user's post-hoc inspection and as the data source for `plan.md`'s `affects projects:` rendering. The orchestrator MAY write them before invoking the workflow (Step 6.5.4) or after — implementations SHALL write them by end of Step 6.5 regardless. Writing before the workflow runs is preferred because the workflow's phase 4 synthesis can read `<plan-dir>/cross-project-plan.json` for the bump-set table's `projects (locations)` cell.

### 6.5.6 Workflow early-exit handling

The workflow can return one of three abort signals. The orchestrator SHALL handle each before advancing to Step 7:

- **Phase 0 `cancel`** (`Cancelled by stale-cleanup`): print exactly `Cancelled. No files modified.` and exit `0`. Steps 7–11 SHALL NOT execute. No plan-dir is created for this run (phase 0's `cancel` short-circuits before plan-dir creation).
- **Phase 1 hard-wall `abort`**: surface the workflow's abort message verbatim. Skip Steps 7–11 (no override prompts, no gate, no apply, no Step 10c cleanup invocation). The plan-dir IS preserved on disk per the workflow's contract; the orchestrator SHALL NOT re-invoke the workflow for cleanup on this path.
- **Phase 3 integrity-gate `abort`**: same as Phase 1 hard-wall — surface message verbatim, skip Steps 7–11, plan-dir preserved on disk.

For Phase 1 `degrade-to-main-agent` (a non-abort outcome of the hard-wall prompt), the workflow proceeds to phase 4 and emits `plan.md` with the degraded banner. The orchestrator continues normally to Step 7 — the degraded path is NOT an early exit.

## Step 7 — Render the cross-project plan

Rendering branches on `mode`. Shallow mode generates the plan table inline from `CrossProjectPlan`. Deep mode reads the workflow-produced `plan.md` from Step 6.5 and appends the orchestrator-owned drift sections.

### 7.S — Shallow mode (`mode === "shallow"` or absent)

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

### 7.D — Deep mode (`mode === "deep"`)

When the workflow returned successfully in Step 6.5 (i.e. `<plan-dir>/plan.md` exists at the plan-dir root):

1. **Read** `<plan-dir>/plan.md` and surface its content verbatim. The workflow's cross-project plan template emits these five H2 sections, in this exact order:
    - `## Improvements (universal — applicability checked per project at apply time)`
    - `## Workarounds resolved`
    - `## Skipped or unavailable`
    - `## Cross-project bump set`
    - `## Changelogs`

    The `Cross-project bump set` table uses three columns: `package`, `proposed target`, `projects (locations)`. The third column merges per-project + per-location data: e.g., a row for `react` bumped to `^19.0.14` across `proj-A` (root) and `proj-B` (root) renders `proj-A (root); proj-B (root)` (`;` separates projects, `,` separates multiple locations within the same project). The orchestrator SHALL NOT regenerate this table inline — the workflow already produced it from the `<plan-dir>/cross-project-plan.json` artifact persisted in Step 6.5.5. The `## Changelogs` section is workflow-produced (per the `parallel-research-workflow` changelog requirement) and is surfaced verbatim along with the rest of `plan.md`; the orchestrator SHALL NOT regenerate or summarize it.

2. **Append** the orchestrator-owned drift sections after the workflow's content, in this exact order. Each section is omitted when its count is zero:
    - `**Warnings:**` heading with each warning as a `-` bullet, when the orchestrator's `warnings[]` list (the running list across Step 5, Step 6.5.2 grouping-skill warnings, Step 6.5.3 mixed-pm warning, and any later source) is non-empty.
    - `**Skipped (scan-failed) (<N>):**` heading with `<name>: <error>` bullets, when `scanFailed[]` is non-empty.
    - `**Skipped (path missing) (<N>):**` heading with `<name> — <path>` bullets, when `pathMissing[]` is non-empty.

    These three sections are orchestrator-owned (they originate at Steps 2.2, 4.2, 5, and 6.5.3) — the workflow does NOT know about per-project scan failures or path-missing drift, so it cannot emit them in `plan.md`. The orchestrator MUST append them at Step 7 rendering time.

### 7.1 Empty-plan early exit

#### 7.1.S — Shallow mode

If the post-policy plan has no apply-able packages (every package was scan-failed, path-missing, or `skip-package`-dropped):

- Print any warnings and the literal line `No <level> updates available across selected projects.`
- Exit `0` with no apply, no install, no override execution.

#### 7.1.D — Deep mode

If the workflow's `plan.md` reports zero bumps (the `Cross-project bump set` table has no data rows) AND zero improvements (`Improvements (...)` section body is the `_no improvements identified_` sentinel) AND zero workarounds (`Workarounds resolved` section body is the `_no workarounds resolved_` sentinel):

- Print any orchestrator warnings (per the rules in Step 7.D, point 2 above).
- Print exactly `No <level> updates available across selected projects.`
- Exit `0` without invoking Step 8, Step 9, Step 10a/10b/10c, or Step 11.

The plan-dir is preserved on disk; the workflow's end-of-flow cleanup runs separately when the next deep-mode invocation hits phase 0 stale-cleanup (>10 days). The orchestrator SHALL NOT delete the plan-dir on the empty-plan exit path.

## Step 8 — Override registry consultation

**Mode-independent.** Step 8 runs identically in both `shallow` and `deep` modes — same registry path default, same first-win matching, same `run-override` / `skip-matched` / `force-generic` prompt, same `OVERRIDE_RUN` / `OVERRIDE_SKIP` / `GENERIC` partitioning. This is Decision 5 in `design.md`: cross-project deep mode IS consulted for overrides (explicit divergence from single-project `npm-update-deep-patch`, which deliberately skips overrides). Rationale: in cross-project context, Storybook-style families spanning multiple projects need the same coordinated handling shallow already provides; degrading to "run shallow first, then deep" would defeat the one-command UX.

Resolve overrides using the **`apply-npm-updates` override-resolution procedure** (R1–R3) for registry load, first-win matching, and `{version}` resolution — the shared procedure, NOT an inline copy of the algorithm. The cross-project prompt (8.4) and the cross-project resolution **scope** stay owned by this skill.

### 8.1 Load + match + resolve (procedure R1–R3)

Invoke the procedure with the registry path from `overrideRegistryPath` (default `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`) and the resolution source set to the **cross-project aggregated `proposedTarget` set** (NOT per-project):

- **R1 (load)** — on a missing/unparseable registry the procedure prints `Override registry unavailable: <reason>. Proceeding without overrides.` and treats it as empty. Do NOT abort.
- **R2 (first-win glob match)** — over the post-policy plan's package names. Build `MATCHED_BY_ENTRY = { entry.id → [packages bound to this entry] }`.
- **R3 (resolve + interpolate)** — resolve `{version}` against the cross-project `proposedTarget` set: `target-of:<name>` → the `proposedTarget` of the package whose `name == <name>` in the cross-project plan (prefix-stripped); `max-target-of:<glob>` → the max semver across `proposedTarget` of packages whose `name` matches `<glob>` (prefix-stripped); `latest` → the literal `latest`; with `fallbackVersionSource` fallback. `{version}` resolution SHALL run against the cross-project aggregate, never per-project. On an unresolvable entry the procedure warns, drops the entry, and its matched packages rejoin the generic flow. Otherwise the resolved version is interpolated into `command`.

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

Raise exactly **one** `AskUserQuestion`. The option set depends on `mode`.

### 9.S — Shallow-mode options (three)

- **Question copy**: `Apply <level> updates across <N> project(s)?`
- `multiSelect: false`
- **Options** (in this exact order):
  - `apply-all` — Proceed with the entire (post-policy, post-override) plan.
  - `pick-subset` — Accept a free-form package-name list to exclude before apply.
  - `cancel` — Exit without modifying any file.

### 9.D — Deep-mode options (four)

- **Question copy**: `Apply <level> updates across <N> project(s)?` (same as shallow)
- `multiSelect: false`
- **Options** (in this exact order):
  - `apply-all` — Proceed with the entire (post-policy, post-override) plan, INCLUDING the post-bumps plan-mode improvements round (Step 10b).
  - `apply-bumps-only` — Apply bumps + overrides + installs sequentially per project (Step 10a), but SKIP the plan-mode improvements round (Step 10b) entirely. The Step 11 summary's `Applied improvements` section is omitted (zero items). All `run-override` decisions resolved in Step 8 still execute on this path because they were resolved before the gate.
  - `pick-subset` — Accept a free-form selection combining improvement-bullet titles AND package names. Substring match (case-insensitive) for improvements; exact match for bumps. Excluded improvements skip Step 10b for those bullets; excluded packages skip Step 10a for those names.
  - `cancel` — Exit without modifying any file. In deep mode the plan-dir IS preserved on disk and the orchestrator invokes Step 10c (end-of-flow cleanup) before exiting; in shallow mode there is no plan-dir.

### 9.1 `apply-all`

Let `ACCEPTED = post-policy ∖ OVERRIDE_SKIP`. Proceed to Step 10 (shallow) or Step 10a (deep).

### 9.2 `pick-subset`

#### 9.2.S — Shallow `pick-subset` (package names only)

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
    - Re-prompt step 9.2.S.2.
6. Let `ACCEPTED = post-policy \ {names in EXCLUDED} \ {names in OVERRIDE_SKIP}` (set difference: drop both excluded and override-skipped packages — `OVERRIDE_SKIP` MUST NOT be re-included by `pick-subset`). Let `SKIPPED_BY_USER = EXCLUDED`.
7. If `ACCEPTED` is empty after exclusion → print `All updates excluded; nothing to apply.` and exit `0` without touching files.
8. Otherwise proceed to Step 10.

#### 9.2.D — Deep `pick-subset` (package names AND improvement titles)

Free-form selection over both improvement bullets and package bump names (mirrors single-project `npm-update-deep-patch.md` Step 6c).

1. Compute `VALID_BUMP_NAMES` = unique names in the post-policy plan (post Step 6 conflict policy), then remove names in `OVERRIDE_SKIP` — same as shallow `VALID_NAMES`.
2. Compute `VALID_IMPROVEMENT_TITLES` = the leading title text of each `-` bullet under the `## Improvements (universal — applicability checked per project at apply time)` heading in the workflow's `plan.md`. The title is the prefix before the `(group: ...; affects projects: ...)` parenthetical — typically formatted as `{package}: {opportunity description}` or `[{priority}] {package} — {opportunity}`.
3. Ask the user (free-form message, no AskUserQuestion):

    ```text
    Enter the IDs to apply (comma-separated or one per line). Use plan-line excerpts for improvements
    (case-insensitive substring match), package names for bumps. Empty response cancels.
    Improvements: {comma-separated VALID_IMPROVEMENT_TITLES}
    Bumps: {comma-separated VALID_BUMP_NAMES}
    ```

4. Parse the response: split on commas and newlines, trim whitespace, drop empty tokens. Result: `SELECTIONS`.
5. Empty `SELECTIONS` → equivalent to `cancel` (Step 9.3). Print `Cancelled. No files modified.` and proceed to Step 10c cleanup + Step 11 summary (with the cancel section).
6. For each token in `SELECTIONS`, classify it as:
    - An **improvement** if it matches an entry in `VALID_IMPROVEMENT_TITLES` via case-insensitive substring (the token is a substring of a valid title).
    - A **bump** if it matches an entry in `VALID_BUMP_NAMES` exactly (case-sensitive).
    - **Unknown** if it matches neither.
7. On any unknown tokens:
    - Print `Unknown selection(s): {invalid items}. Valid improvements: {VALID_IMPROVEMENT_TITLES}. Valid bumps: {VALID_BUMP_NAMES}.`
    - Re-prompt step 9.2.D.3.
8. Compute:
    - `ACCEPTED_BUMPS = post-policy ∖ OVERRIDE_SKIP, restricted to names in the bump-classified selections`.
    - `ACCEPTED_IMPROVEMENTS = improvement bullets whose title text matches at least one improvement-classified selection (case-insensitive substring)`.
    - `SKIPPED_BY_USER = VALID_BUMP_NAMES \ ACCEPTED_BUMPS` (package names the user chose to exclude).
    - `SKIPPED_IMPROVEMENTS_BY_USER = VALID_IMPROVEMENT_TITLES \ ACCEPTED_IMPROVEMENTS` (improvement bullets the user chose to exclude — appear in Step 11 `Skipped improvements` with `(excluded via pick-subset)`).
9. If both `ACCEPTED_BUMPS` is empty AND `ACCEPTED_IMPROVEMENTS` is empty → treat as `cancel` (Step 9.3). Print `Cancelled. No files modified.` and proceed to Step 10c + Step 11.
10. Otherwise proceed to Step 10a with `ACCEPTED = ACCEPTED_BUMPS` (Step 10a filters by name) and Step 10b with `ACCEPTED_IMPROVEMENTS` as the in-scope bullets only.

### 9.3 `cancel`

Print exactly:

```text
Cancelled. No files modified.
```

In **shallow mode**: exit `0` without touching files. Do NOT run any apply, install, or override command.

In **deep mode**: the plan-dir exists (Step 6.5 created it). Do NOT run any apply, install, or override command, but DO invoke Step 10c (end-of-flow cleanup) before rendering the Step 11 summary. The summary's H1 SHALL be the deep H1 (`## commander-update-deep-<level> summary`) and the summary SHALL contain a single body line `Cancelled. No files modified.` plus the always-rendered `Suggested next steps` section.

## Step 10 — Sequential apply (one project at a time, stop-on-fail)

The apply step splits by mode.

- **Shallow mode** (`mode === "shallow"` or absent): a single per-project bumps loop with no plan-mode round and no end-of-flow cleanup invocation. The existing 10.1–10.6 sub-steps apply unchanged. The orchestrator returns after Step 10.6 (or on stop-on-fail) and renders Step 11.
- **Deep mode** (`mode === "deep"`): split into three phases:
    1. **Step 10a — Bumps loop** (identical to shallow Step 10.1–10.6).
    2. **Step 10b — Cross-project plan-mode round** for improvements (NEW; conditional — see 10b's gating below).
    3. **Step 10c — End-of-flow cleanup invocation** (NEW; runs on every deep path except workflow-abort paths).

    Stop-on-fail in Step 10a aborts BOTH Step 10a and Step 10b. Step 10c still runs (the plan-dir exists and the user deserves a cleanup decision).

### Step 10a — Bumps loop (both modes; renamed from "Step 10" for shallow)

Iterate the resolved project set in **registry insertion order** (already preserved through Steps 2–9). For each project:

### 10.1 Compute the per-project subset

Collect occurrences in `ACCEPTED` whose `projectName` matches this project. Apply:

- The chosen conflict policy (Step 6) — drop occurrences for `skip-package`-dropped packages; preserve per-project `effectiveTarget` under `per-project`; honor partition under `use-max-where-possible`.
- The override partition (Step 8.5) — drop occurrences in `OVERRIDE_SKIP`; route `OVERRIDE_RUN` packages to the apply spec's `overrideCommands`; route everything else (GENERIC) to the apply spec's `manifestBumps` / `catalogEdits` (built in Step 10.3).
- The user exclusion (Step 9.2) — already excluded from `ACCEPTED`.

If the per-project subset is empty (no generic occurrences AND no override entries touch this project), skip apply AND install for this project. Continue to the next.

### 10.2 Set the working directory

For every Bash invocation in the apply for this project, prepend `cd "<record.path>" &&` (or use absolute paths for ncu's `--packageFile`). The skill SHALL NOT mutate the user's shell state across iterations.

### 10.3 Build the per-project apply spec and invoke `apply-npm-updates`

The `apply-npm-updates` skill is the single source of truth for the per-project mechanical apply (generic `ncu` `package.json` bumps, `pnpm-workspace.yaml` catalog edits, override commands, single install). The orchestrator builds the resolved spec for this project and invokes the skill **once**; it SHALL NOT restate the `ncu` / catalog / install recipe inline.

Build the spec from this project's subset (Step 10.1):

- `packageManager` = this project's `ScanResult.packageManager`. `cwd` = `<record.path>`. `target` = the orchestrator's `target` input. `cooldown` = the value `scan-npm-updates` resolved for this project (omit for `pnpm`).
- `manifestBumps` — one element per distinct `GENERIC` `package.json` `sourceFile`: `{ sourceFile, names: <GENERIC names for this file, space-separated>, includeFilter }`. Set `includeFilter: true` when **any** of: the user picked `pick-subset` and excluded ≥1 package for this project; any update for the file was removed by `OVERRIDE_RUN`/`OVERRIDE_SKIP`; or the conflict policy is `use-max-where-possible` and ncu's full set ≠ this project's effective subset. Otherwise `false` (ncu's own set equals the target set for this file).
- `catalogEdits` — one element per `GENERIC` occurrence with `sourceFile === "pnpm-workspace.yaml"`: `{ name, targetVersion: <effectiveTarget> }`.
- `overrideCommands` — the `OVERRIDE_RUN` entries that touch this project, as `{ id, command: <interpolated command> }`, in declaration order (run once per affected project).
- `skipInstall` — `true` when every accepted package for this project went through `run-override` AND no generic ncu bump ran AND no catalog edit happened for this project (every override handles its own install); otherwise `false`.

Invoke `apply-npm-updates` once with this spec and `cwd: <record.path>`. The skill streams `ncu` / install / override stdout/stderr verbatim and returns `{ appliedGeneric, appliedOverrides, installRan, failure }`. Fold the returned fragment into this project's entry of the cross-project summary (Step 11).

### 10.4 On structured failure — format the cross-project abort copy

If `apply-npm-updates` returns a non-null `failure`, **stop the entire run** (Step 10.6) and print the orchestrator-owned cross-project abort copy for the failing `step` (the skill never prints this copy):

- `step: "ncu"` →

    ```text
    ncu --upgrade failed on {sourceFile} ({projectName}, exit {code}).
    Stopping the run. Subsequent projects not attempted.
    ```

- `step: "catalog"` →

    ```text
    Failed to bump {name} in pnpm-workspace.yaml ({projectName}): {reason}.
    Stopping the run. Subsequent projects not attempted.
    ```

- `step: "override"` →

    ```text
    Override command failed ({entry.id}, {projectName}, exit {code}): {interpolated command}.
    Stopping the run. Subsequent projects not attempted.
    ```

- `step: "install"` →

    ```text
    Install failed ({pm}, {projectName}, exit {code}). Manifests already bumped; review changes before retrying.
    Stopping the run. Subsequent projects not attempted.
    ```

Then jump to Step 11 (summary) with the run partition (applied / failed / pending).

### 10.6 Stop-on-fail

On any failure (ncu, override, install) in any project:

- Stop iteration immediately.
- Do NOT attempt apply for subsequent projects.
- Mark the failed project with the failing step + exit code.
- Mark all unattempted projects as `pending`.
- In **shallow mode**: proceed directly to Step 11 (summary).
- In **deep mode**: SKIP Step 10b entirely (stop-on-fail in 10a aborts the plan-mode round), then proceed to Step 10c (end-of-flow cleanup invocation), then Step 11.

### Step 10b — Cross-project plan-mode round (deep mode only)

Fires only when ALL of:

- (a) `mode === "deep"`.
- (b) The Step 9 gate option was `apply-all` (NOT `apply-bumps-only`, NOT `cancel`). For `pick-subset` see 10b.0 below.
- (c) Step 10a completed for every applied project without stop-on-fail (i.e. `failedProject` is unset and `pendingProjects` is empty).
- (d) The workflow's `plan.md` contains at least one improvement bullet (`Improvements (...)` section body is NOT the `_no improvements identified_` sentinel).

If any of (a)–(d) is false, Step 10b SHALL NOT execute. The Step 11 summary's `Applied improvements` section is omitted (zero items).

#### 10b.0 Determine in-scope improvements

When the gate was `apply-all`, every improvement bullet in `plan.md` is in scope.

When the gate was `pick-subset` (deep path 9.2.D), only improvement bullets whose titles matched the user's selection (case-insensitive substring) are in scope — i.e., `ACCEPTED_IMPROVEMENTS` computed in 9.2.D step 8. If `ACCEPTED_IMPROVEMENTS` is empty (the user selected only bumps), Step 10b SHALL NOT execute and the Step 11 summary's `Applied improvements` section is omitted. Improvement bullets the user excluded are recorded for the Step 11 `Skipped improvements` section with the parenthetical `(excluded via pick-subset)`.

#### 10b.1 Reconnaissance pass

For each in-scope improvement bullet:

1. Read the bullet's `affects projects: <comma-separated names>` tag from `<plan-dir>/plan.md` (set by the workflow's phase 4 synthesis from `<plan-dir>/cross-project-plan.json`).
2. Compute `APPLIED_FOR_BULLET = affects-projects-list ∩ <projects that successfully applied bumps in Step 10a>`.
3. For each `projectName` in `APPLIED_FOR_BULLET`:
    - The main agent reads the project's hinted areas — file globs, directory hints, framework names from the bullet's `Hint:` line and any adjacent context in the bullet body.
    - Classifies the (bullet, project) pair as:
        - **applicable**: a concrete edit lands here. Capture the absolute file path + a short imperative description + (for non-trivial edits) a before/after snippet.
        - **inapplicable**: a one-sentence reason explaining why (e.g. `Project uses Solid, not React; useTransition has no equivalent here.`).

Reconnaissance SHALL NOT execute tests, lint, or build. SHALL NOT modify any file. SHALL NOT run any package-manager command. Pure read.

#### 10b.2 Plan-mode entry (mandatory)

The main agent invokes the `EnterPlanMode` tool exactly **once**, with a unified markdown document structured as:

````markdown
# Cross-project improvements (deep-<level>): <slug>

## Applicable (<N>)

### {bullet title} → {projectName}

- **File**: <absolute path>
- **Description**: <short imperative sentence>
- **Before** (optional for non-trivial edits):
    ```
    <before snippet>
    ```
- **After** (optional for non-trivial edits):
    ```
    <after snippet>
    ```

...

## Inapplicable (<M>)

- {bullet title} → {projectName} — {one-sentence reason}
- ...

## Summary

- applicable: <N>
- inapplicable: <M>
````

The `applicable` and `inapplicable` counts at the bottom mirror the per-(bullet, project) entries above. The plan-mode document includes every (bullet, applied project) pair from 10b.1 — applicable entries with their concrete edits, inapplicable entries with their reasons.

#### 10b.3 User review

Plan mode pauses until the user accepts or rejects.

- **Approved**: exit plan-mode, execute the listed edits across projects via `Edit` / `Write`. Edits run sequentially per (project, file). Record the applied `(bullet, project)` pairs into `APPLIED_IMPROVEMENTS` for the Step 11 `Applied improvements` section. Continue to Step 10c.
- **Rejected**: print exactly `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.` and continue to Step 10c. The Step 11 `Skipped improvements` section lists every in-scope bullet with the parenthetical `(rejected at plan-mode review)`. Applied bumps from Step 10a are NOT reverted.

#### 10b.4 Plan-mode hard rules

- The plan-mode round SHALL NOT expand scope beyond bullets present in `plan.md`. Adjacent opportunities the main agent discovers during reconnaissance SHALL be surfaced in the Step 11 `Suggested next steps` list, NEVER silently added to the plan-mode document.
- The plan-mode round SHALL NOT execute tests, lint, or build.
- The plan-mode round SHALL NOT create commits, branches, or pull requests.
- The plan-mode round SHALL NOT touch any file outside the bullet's `affects projects:` set.

### Step 10c — End-of-flow cleanup invocation (deep mode only)

Fires only when `mode === "deep"`. Re-invokes `experiments:parallel-research-workflow` for end-of-flow cleanup exactly **once** per deep run.

The workflow prompts the user via `AskUserQuestion`:

- **Question**: `Plan dir at <plan-dir>. Keep for inspection or delete?`
- `multiSelect: false`
- **Options**:
  - `delete-plan` — recursively `rm -rf <plan-dir>`.
  - `keep-plan` — leave it on disk; the next deep invocation's phase 0 stale-cleanup catches it after 10 days.

Capture the user's choice into `cleanupOutcome ∈ { "delete-plan", "keep-plan" }`. The Step 11 summary's `Suggested next steps` uses `cleanupOutcome` to decide whether to include the `Review <plan-dir>/plan.md before re-running.` bullet.

**Skip Step 10c when** the workflow returned an abort signal in Step 6.5.6 (phase 1 hard-wall abort or phase 3 integrity-gate abort). On abort paths the orchestrator has already exited before reaching this point — Step 10c is not reached. On Step 9 `cancel` (deep), on Step 10a stop-on-fail (deep), on Step 10b rejection, and on the happy path, Step 10c DOES fire — the plan-dir exists and the user deserves a single cleanup decision per run.

The orchestrator SHALL NOT prompt for cleanup itself — the workflow owns the prompt. If the user picks `delete-plan`, the workflow removes the plan-dir before returning; the orchestrator's Step 11 summary still references `<plan-dir>` by its captured path but the `Review <plan-dir>/plan.md` bullet is omitted (no plan to review).

## Step 11 — Cross-project summary

Print a markdown summary. The H1 varies by mode. Render sections conditionally; sections with count zero SHALL be omitted, except `Suggested next steps`, which SHALL always appear.

**H1**:

- `mode === "shallow"` (or absent): `## commander-update-<level> summary` (e.g. `## commander-update-patch summary`)
- `mode === "deep"`: `## commander-update-deep-<level> summary` (e.g. `## commander-update-deep-patch summary`)

```markdown
## commander-update-<level> summary # shallow

## commander-update-deep-<level> summary # deep

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

**Applied improvements (<N>):** # deep mode only

- {bullet title} → {projectName} ({sourceFile or general hint})
- ...

**Skipped improvements (<N>):** # deep mode only

- {bullet title} (excluded via pick-subset)
- {bullet title} → {projectName} (rejected at plan-mode review)
- ...

**Inapplicable improvements (<N>):** # deep mode only

- {bullet title} → {projectName} ({one-sentence reason})
- ...

**Skipped or unavailable groups (<N>):** # deep mode only — copied verbatim from plan.md

- {groupId} — {reason}.
- ...

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
- Review <plan-dir>/plan.md before re-running. # deep mode only, when cleanupOutcome === "keep-plan"
```

### 11.1 Section gating

| Section                       | Mode(s)   | Render when                                                                                     |
| ----------------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| Applied projects              | both      | At least one project applied successfully (full or empty).                                      |
| Failed project                | both      | Stop-on-fail triggered.                                                                         |
| Pending projects              | both      | Stop-on-fail triggered AND at least one project unattempted.                                    |
| Applied improvements          | deep only | Step 10b executed AND at least one (bullet, project) edit was approved and applied.             |
| Skipped improvements          | deep only | At least one improvement bullet was excluded via `pick-subset` OR rejected at plan-mode review. |
| Inapplicable improvements     | deep only | At least one (bullet, project) pair was marked inapplicable during 10b.1 reconnaissance.        |
| Skipped or unavailable groups | deep only | `plan.md`'s `## Skipped or unavailable` section has at least one non-sentinel bullet.           |
| Skipped (path missing)        | both      | `pathMissing[]` non-empty.                                                                      |
| Skipped (scan-failed)         | both      | `scanFailed[]` non-empty.                                                                       |
| Skipped by user               | both      | `pick-subset` excluded at least one package.                                                    |
| Skipped by conflict policy    | both      | `skip-package` policy chosen with at least one match.                                           |
| Skipped by override           | both      | At least one override entry got `skip-matched`.                                                 |
| Warnings                      | both      | `warnings[]` non-empty.                                                                         |
| Suggested next steps          | both      | Always.                                                                                         |

### 11.1.D Deep-mode section formats

- **Applied improvements**: one line per applied (bullet, project) pair. Format `- {bullet title} → {projectName} ({sourceFile or general path hint})`. The `sourceFile or hint` cell is the absolute path of the primary file edited under that pair when a single file is dominant; otherwise a generic hint like `multiple files under apps/<workspace>/src/`.
- **Skipped improvements**: distinguish the two skip reasons with the parenthetical:
  - `(excluded via pick-subset)` — when the user excluded the bullet at the gate (9.2.D).
  - `(rejected at plan-mode review)` — when the user rejected the whole plan-mode round at 10b.3.
- **Inapplicable improvements**: one line per (bullet, project) pair marked inapplicable during 10b.1. Format `- {bullet title} → {projectName} ({one-sentence reason captured during reconnaissance})`.
- **Skipped or unavailable groups**: copied verbatim from `<plan-dir>/plan.md`'s `## Skipped or unavailable` section (workflow-owned). Heading count `<N>` is the bullet count under that section in `plan.md`.

### 11.1.D.1 Suggested next steps in deep mode

Deep mode includes the same three baseline bullets (test, lint/typecheck, git diff + commit) AND adds a fourth bullet conditionally:

- When `cleanupOutcome === "keep-plan"` (recorded by Step 10c — see the workflow's global `_meta.json` end-of-flow cleanup state): include `- Review <plan-dir>/plan.md before re-running.` as the fourth bullet, substituting `<plan-dir>` with the absolute plan-dir path captured in Step 6.5.4.
- When `cleanupOutcome === "delete-plan"`: omit the fourth bullet (the plan-dir was deleted; there is no `plan.md` to review).
- When Step 10c was skipped (workflow abort paths): the orchestrator already exited before Step 11 — this branch is not reached.

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
- `Error: invalid mode "<value>". Expected shallow|deep.` — Step 1 input validation (deep-mode addition).
- `No projects registered. Use /commander:add to register one.` — Step 2 empty registry.
- `unsupported registry version: <n>` — Step 2 version gate.
- `registry file is not valid JSON` — Step 2 parse failure.
- `Filter name not found: <name>` — Step 2.1 unmatched filter.
- `No projects matched the filter.` — Step 2.1 every filter name unmatched.
- `No selectable projects after path-drift filtering.` — Step 2.4 every retained record path-missing.
- `No projects selected. Cancelled.` — Step 3 empty multi-select.
- `Mixed package managers across selected projects: <pm list>.` — Step 6.5.3 warning (deep mode), surfaces in summary `Warnings` section.
- `Override registry unavailable: <reason>. Proceeding without overrides.` — Step 8.1 graceful degradation.
- `No <level> updates available across selected projects.` — Step 7.1 empty-plan exit (both modes).
- `All accepted updates were skipped by override policy. Nothing to apply.` — Step 8.5 every package skip-matched.
- `Unknown package name(s): {invalid names}. Valid names: {VALID_NAMES}.` — Step 9.2.S invalid pick-subset (shallow).
- `Unknown selection(s): {invalid items}. Valid improvements: {titles}. Valid bumps: {names}.` — Step 9.2.D invalid pick-subset (deep).
- `All updates excluded; nothing to apply.` — Step 9.2.S empty post-exclusion (shallow).
- `Cancelled. No files modified.` — Step 9.3 user cancel (both modes); also Step 9.2.D empty selection treated as cancel.
- `ncu --upgrade failed on {sourceFile} ({projectName}, exit {code}). Stopping the run. Subsequent projects not attempted.` — Step 10.4 `apply-npm-updates` `ncu` failure.
- `Failed to bump {name} in pnpm-workspace.yaml ({projectName}): {reason}. Stopping the run. Subsequent projects not attempted.` — Step 10.4 `apply-npm-updates` `catalog` failure.
- `Override command failed ({entry.id}, {projectName}, exit {code}): {interpolated command}. Stopping the run. Subsequent projects not attempted.` — Step 10.4 `apply-npm-updates` `override` failure.
- `Install failed ({pm}, {projectName}, exit {code}). Manifests already bumped; review changes before retrying. Stopping the run. Subsequent projects not attempted.` — Step 10.4 `apply-npm-updates` `install` failure.
- `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.` — Step 10b.3 plan-mode rejection (deep mode).

## Non-goals (deferred)

- Per-project parallel apply — sequential by design.
- Cross-machine registry sync.
- Auto-migration of v1 records.
- Lockfile/concurrency for the registry.
- Tests — manual verification only.
- Shared `apply-npm-updates` skill extracted from `npm-update-patch.md` — deferred until the deep variants land (third consumer).
- `--projects a,b,c` CLI flag — deferred until a scripted caller appears.
- Auto-rollback of applied projects on failure — out of scope.

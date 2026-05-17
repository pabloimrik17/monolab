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

### Load the registry

Read `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`. Parse it as YAML into a list of entries under the top-level `overrides:` key. Required fields per entry: `id`, `matches`, `command`, `versionSource`. Optional: `fallbackVersionSource`, `reference`, `notes`.

If the file is missing, cannot be read, fails to parse, or lacks `overrides`, print a single-line warning (`Override registry unavailable: {reason}. Proceeding without overrides.`) and treat the registry as empty — do NOT abort. This is graceful degradation; legacy behaviour is preserved.

### Compute matches

For each update in `ACCEPTED`, determine the first entry whose `matches` list includes a pattern that matches the update's `name`. Pattern semantics:

- `*` matches any run of characters within a package name (so `@storybook/*` matches `@storybook/react` and `@storybook/addon-essentials`, and `storybook-addon-*` matches `storybook-addon-themes`).
- No other glob metacharacters. Exact strings (`storybook`) match only that literal name.

Matching is **first-win**: an update binds to at most one entry, the first one in declaration order whose `matches` coincide. Updates that bind to no entry remain candidates for the generic flow (Step 6).

Let `MATCHED_BY_ENTRY` be a map `entry.id → [updates bound to this entry]`. If `MATCHED_BY_ENTRY` is empty, skip to Step 6 without prompting.

### Resolve `{version}`

For each entry in `MATCHED_BY_ENTRY`, resolve the interpolated command string:

- `target-of:<name>` → the `targetVersion` of the accepted update whose name equals `<name>`, stripped of any leading `^`/`~`/`=`. If that update is not in `ACCEPTED`, treat the source as unresolved.
- `max-target-of:<glob>` → the max semver across `targetVersion` values (prefix-stripped) of accepted updates whose names match `<glob>`. If no update matches the glob, treat the source as unresolved.
- `latest` → the literal string `latest`.

If `versionSource` is unresolved and `fallbackVersionSource` is defined, try it. If both fail, emit a warning (`Cannot resolve {version} for override {id}: neither {versionSource} nor {fallbackVersionSource} produced a value. Falling back to generic ncu --upgrade for matched packages.`), drop this entry from `MATCHED_BY_ENTRY`, and let its matched updates rejoin the generic flow.

Interpolate the resolved version into `command` by replacing the literal token `{version}`.

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

### Partition for Step 6

Compute three disjoint subsets of `ACCEPTED` before continuing:

- `OVERRIDE_RUN = { updates bound to an entry whose action is run-override }` — handled by running the override command; excluded from ncu.
- `OVERRIDE_SKIP = { updates bound to an entry whose action is skip-matched }` — excluded from everything.
- `GENERIC = ACCEPTED − OVERRIDE_RUN − OVERRIDE_SKIP` — includes every update that did not bind to any entry PLUS every update bound to a `force-generic` entry.

If every update in `ACCEPTED` falls under `OVERRIDE_SKIP` and `OVERRIDE_RUN` is also empty, print `All accepted updates were skipped by override policy. Nothing to apply.` and exit without touching files.

## Step 6 — Apply bumps

Group `GENERIC` by `sourceFile` and distinguish two manifest kinds. Then run `OVERRIDE_RUN` entries.

### For a `package.json` file (GENERIC, manifest kind = `package.json`)

Invoke `npm-check-updates@21.0.2` once per distinct `sourceFile`:

```bash
<runner-prefix> npm-check-updates@21.0.2 \
  -p <pm> \
  --target patch \
  --upgrade \
  --packageFile <sourceFile> \
  [--cooldown <period>]        # mirror the value the scan resolved; omit for pnpm (ncu reads pnpm-workspace.yaml natively)
  [--filter "<names>"]         # include only when the set for this file is a strict subset of the ncu-detectable candidates (pick-subset OR force-generic partial inclusion)
```

The `<runner-prefix>` is the same as the one `scan-npm-updates` used (`pnpm dlx`, `npx -y`, `yarn dlx`, `bunx`, `deno run --allow-read --allow-net npm:`). `-p <pm>` MUST be passed (same PM the scan used) to mirror scan semantics and prevent ncu auto-detection drift — e.g. ncu otherwise auto-detects `deno` when a sibling `deno.json` exists, collapsing `--dep` to `['imports']` and dropping `dependencies`/`devDependencies` updates.

`<names>` is the GENERIC package names for this file (i.e., accepted minus `OVERRIDE_RUN`/`OVERRIDE_SKIP` for that file), joined by single spaces, double-quoted. It is a literal list; ncu treats it as exact names (see `research/ncu-filter-spike.md`).

Include `--filter` when:

- the primary prompt was `pick-subset` **and at least one package was excluded**, OR
- any update for this file was removed by `OVERRIDE_RUN`/`OVERRIDE_SKIP` (to prevent ncu from bumping packages the user chose to route through an override or skip).

Omit `--filter` when the bumps for this file are effectively full-set apply (including `pick-subset` with empty exclusions) and no overrides touch this file — i.e. ncu's own set equals our target set.

Stream ncu's stdout/stderr through to the user so diffs are observable. If ncu exits non-zero on a file, abort with:

```text
ncu --upgrade failed on {sourceFile} (exit {code}).
Applied before this failure: {manifest paths already rewritten}.
Re-run /experiments:npm-update-patch to retry the rest.
```

Stop immediately; do not run install and do not run any override command.

### For `pnpm-workspace.yaml` (GENERIC, manifest kind = catalog)

ncu 21.0.2 does not rewrite catalog entries (see `research/ncu-catalog-spike.md`). Keep the in-memory edit path:

For each update in `GENERIC` with `sourceFile === "pnpm-workspace.yaml"`:

- Under the top-level `catalog:` block, locate the key matching `name`.
- Replace the value with `targetVersion`. Preserve surrounding whitespace, comments, and other keys' order.
- Do NOT touch any consumer `package.json` that references `catalog:`.

If a key is unexpectedly missing, abort with:

```text
Failed to bump {name} in pnpm-workspace.yaml: {reason}.
Applied so far: {names already written on disk}.
Re-run /experiments:npm-update-patch to retry the rest.
```

Stop immediately; do not run install and do not run any override command.

### Run override commands (OVERRIDE_RUN)

After the generic path has written every manifest successfully, execute each entry's interpolated command once, in declaration order. Stream stdout/stderr. If any override exits non-zero, abort with:

```text
Override command failed ({entry.id}, exit {code}): {interpolated command}.
Generic bumps already written to disk: {manifest paths}.
Override-executed before this failure: {entry ids}.
Review changes and retry.
```

Stop immediately; do NOT run `ncu --upgrade` for the matched packages as a fallback (leaves the tree in a consistent, reviewable state) and do NOT run the final install for this invocation.

## Step 7 — Install

If `OVERRIDE_RUN` is non-empty, `OVERRIDE_SKIP` is empty, `GENERIC` is empty, and no catalog write happened (i.e., every accepted update was handled by `run-override` and nothing outside override commands was written), SKIP the final install — every override command is assumed to handle its own install (record this in the summary).

Otherwise, run exactly one install command based on `packageManager`:

| PM   | Command        |
| ---- | -------------- |
| pnpm | `pnpm install` |
| npm  | `npm install`  |
| yarn | `yarn install` |
| bun  | `bun install`  |
| deno | `deno install` |

Stream the output. If the install exits non-zero, abort with:

```text
Install failed ({pm} exit {code}). Manifests are already bumped; review changes before retrying.
```

## Step 8 — Summary

After a successful install (or after skipping it per Step 7), print:

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

**Install:** {"<pm> install executed" | "skipped (overrides handled install)"}

**Suggested next steps (not executed):**

- Run your test suite.
- Run lint / typecheck.
- Review changes (`git diff`) and commit.
```

- Omit any block whose count is zero (except `Suggested next steps`, which is always present).
- When `{Ng}` is non-zero, list each update with its original `location`.
- When `{No}` is non-zero, list each override entry with the command that ran and the matched names (surface enough information that the user can re-invoke the override manually if needed).
- Do not run any of the suggested steps. This is a hard rule.

## Hard rules

- Never run tests, lint, or build.
- Never create commits or PRs.
- Never modify files on `cancel` or when every accepted update is skipped by override policy.
- Never mutate a consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- Never auto-execute an override command without the user selecting `run-override` explicitly for that entry.
- Never run `ncu --upgrade` as a fallback after an override command fails.

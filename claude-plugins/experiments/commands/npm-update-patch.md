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

## Step 6 — Apply bumps

Group `ACCEPTED` by `sourceFile`. For each file, open it once, apply every bump in memory, and write once.

### For a `package.json` file

For each accepted update targeting this file:

- Locate the package name under `dependencies`, `devDependencies`, `peerDependencies`, or `optionalDependencies`. Pick the section where the name is currently declared; do not move it across sections.
- Replace the value with `targetVersion` (the skill preserved the leading `^`/`~`/`=`/none prefix). Do not reformat the file; preserve existing indentation and trailing newline.

### For `pnpm-workspace.yaml`

For each accepted update with `sourceFile === "pnpm-workspace.yaml"`:

- Under the top-level `catalog:` block, locate the key matching `name`.
- Replace the value with `targetVersion`. Preserve surrounding whitespace, comments, and other keys' order.
- Do NOT touch any consumer `package.json` that references `catalog:`.

If a `sourceFile` path cannot be opened or a key is unexpectedly missing, abort with:

```text
Failed to bump {name} in {sourceFile}: {reason}.
Applied so far: {names already written on disk}.
Re-run /experiments:npm-update-patch to retry the rest.
```

Stop immediately; do not run install.

## Step 7 — Install

Run exactly one install command based on `packageManager`:

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

After a successful install, print:

```markdown
## npm-update-patch summary

**Applied ({N}):**

- {name} {currentVersion} → {targetVersion} ({location})
- ...

**Skipped ({M}):**

- {name} ({reason: "excluded by user" | other})
- ...

**Suggested next steps (not executed):**

- Run your test suite.
- Run lint / typecheck.
- Review changes (`git diff`) and commit.
```

- Omit the `Skipped` block entirely when `M === 0`.
- Always include the `Suggested next steps` block.
- Do not run any of the suggested steps. This is a hard rule.

## Hard rules

- Never run tests, lint, or build.
- Never create commits or PRs.
- Never modify files on `cancel` or when the user excludes every update.
- Never mutate a consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.

---
description: Detect and align the dev/runtime toolchain (Node + pnpm/npm/yarn/bun + Deno + Bun-runtime) across a single project, then pin every runtime surface to one resolved target (Node→latest LTS, others→latest). Detect + confirm + apply only — no tests, no commits. Runtime/toolchain upgrades may include breaking changes — review release notes first.
---

# npm-update-engines

Bump the project's **dev/runtime toolchain** — Node, the package manager (pnpm/npm/yarn/bun), Deno, and Bun-as-runtime — by detecting **every** place a runtime/PM version is pinned, resolving one aligned target per engine, and rewriting all runtime surfaces to that **exact** pinned version. The shallow single-project sibling of `/experiments:npm-update-major`, but at **engines level**: it drives `detect-toolchain-surfaces` + `apply-engine-bumps`, never `scan-npm-updates`/`apply-npm-updates`/`ncu`.

> **Runtime/toolchain upgrades may include breaking changes.** This command detects, confirms, and rewrites version surfaces only; it does not migrate code. Review release notes (or use `/experiments:npm-update-deep-engines` for researched migration guidance) before applying.

`engines` here is **not** an ncu dependency level. The command always operates at engines level and **ignores any user-supplied level argument** — `/experiments:npm-update-engines patch` ignores the stray `patch`, runs `detect-toolchain-surfaces`, and never invokes `scan-npm-updates` or `ncu`.

## Step 1 — Detect surfaces

Invoke the `detect-toolchain-surfaces` skill (capability `engine-surface-scanning`) against the project root. Parse the returned `EngineSurfaceInventory`:

```ts
{
  engines: Array<{ engine, surfaces: Array<{ file, locus, currentVersion, kind }>, distinctRuntimeVersions }>,
  ambiguities: [...],
  unknownSurfaces: [...],
  misalignments: [...]
}
```

If the skill aborts, surface its error message verbatim and stop.

## Step 2 — Resolve targets

Resolve the per-engine target via `apply-engine-bumps`'s resolution (Node → latest LTS from the Node dist index; pnpm/npm/yarn/bun → registry `latest`; Deno → latest release). Resolve **only** engines that have at least one `runtime` (or caller-resolvable `ambiguous`) locus.

For each engine, compute whether any `runtime` locus's `currentVersion` differs from the resolved target. If a target source is unreachable (offline), note the engine as skipped (never fabricate a version).

## Step 3 — Handle empty result

If **every** detected runtime surface already matches its resolved target (no engine is out of date), print exactly:

```text
No engine updates available.
```

and exit **without prompting**.

## Step 4 — Ambiguity prompt (default leave)

For each `ambiguous` locus reported by detection (e.g. a publishable package pinning an exact `engines.node`, or a private manifest with a range), raise an `AskUserQuestion` (one per locus, or grouped) naming the supports-vs-runs distinction:

- **Question**: `<file> declares <engine> <currentVersion> at <locus>. Is this the runtime you develop/run with (pin it), or the <engine> range a published package supports (leave it)?`
- **Multi-select**: `false`
- **Options** (in this order — default is leave):
    - `leave` — "Treat as a published-package support range; do not modify (default)."
    - `runtime` — "Treat as the runtime to bump; pin it to the resolved target."

Record each resolution into `ambiguousResolutions` keyed `file::locus`. Loci left unresolved default to **leave**.

## Step 5 — Render surfaces + targets

Render the detected runtime surfaces and proposed targets, **grouped by engine**:

```markdown
### node — <currentVersion(s)> → <target>

- <file> (<locus>): <currentVersion> → <target>
- ...

### pnpm — <currentVersion(s)> → <target>

- ...
```

- List `runtime` loci (plus `ambiguous` loci the user resolved to `runtime`) that will change.
- Note any `support` loci as **left untouched** and any `unknownSurfaces` as **reported, not edited**.
- Surface any intra-repo `misalignments` (they converge to the resolved target).
- Note any engine skipped for being offline/unreachable.

## Step 6 — Gate (with breaking-changes caution)

Raise exactly **one** `AskUserQuestion`:

- **Question**: `Apply engine updates? Runtime/toolchain upgrades may include breaking changes — review the release notes before applying.`
- **Multi-select**: `false`
- **Options** (in this exact order):
    - `apply-all` — "Pin every listed runtime surface to its resolved target."
    - `pick-subset` — "Apply all engines except a set you exclude by engine name."
    - `cancel` — "Exit without modifying any file."

### 6a — `apply-all`

Let `ACCEPTED_ENGINES = every out-of-date engine`. Proceed to Step 7.

### 6b — `pick-subset`

Ask the user (free-form message) to list **engine names** to exclude (valid names = the out-of-date engines). Parse on commas/newlines, trim, drop empties. Empty response → treat as `apply-all`. Validate names; re-prompt on unknown. `ACCEPTED_ENGINES = out-of-date engines minus excluded`. If empty → print `All engines excluded; nothing to apply.` and exit. Otherwise proceed to Step 7.

### 6c — `cancel`

Print exactly `Cancelled. No files modified.` and exit without touching files.

## Step 6.5 — Optional isolation gate (default `none`)

Before applying, offer to isolate the update via **AskUserQuestion**:

- **Question**: `Isolate this engine update before applying?`
- **Multi-select**: `false`
- **Options** (in this exact order):
    - `none` — "Apply in the current working tree (default; no VCS action)."
    - `worktree` — "Create a branch + worktree via `update-isolation` (worktrunk-preferred); apply there. Current checkout untouched."
    - `branch` — "Create a branch in place via `update-isolation` and apply on it."

For `none`, set `APPLY_CWD = <project root>`. Otherwise invoke `update-isolation` **once** for the whole engine bump (one workspace — there is no breaking-change partition at engines level) with `{ projectPath: <project root>, branchName: "deps/engines-<YYYY-MM-DD>", strategy: <worktree → "auto"; branch → "branch"> }`; set `APPLY_CWD = <returned workdir>`. `update-isolation` creates the branch/worktree only — never commits, pushes, or opens a PR.

## Step 7 — Apply via `apply-engine-bumps`

Invoke the `apply-engine-bumps` skill (capability `engine-update-apply`) **exactly once** with:

- `cwd`: `APPLY_CWD` (Step 6.5).
- `inventory`: the Step 1 `EngineSurfaceInventory`.
- `resolvedTargets`: the Step 2 per-engine targets, restricted to `ACCEPTED_ENGINES`.
- `ambiguousResolutions`: from Step 4.
- `confirmed: true` (the user gated at Step 6).

Do NOT restate the rewrite recipe inline (`apply-engine-bumps` owns it) and do NOT touch `support` or `unknownSurfaces` loci. The skill streams its edits and returns `{ resolvedTargets, applied, skipped, droppedHashes, failure? }`.

On a structured `failure`, print the abort copy referencing this command, then stop:

```text
apply-engine-bumps failed ({failure.step}{failure.file ? ", " + failure.file : ""}): {failure.detail}.
Some surfaces may already be rewritten; review changes.
Re-run /experiments:npm-update-engines to retry the rest.
```

On success, proceed to Step 8.

## Step 8 — Summary

Compose from the `apply-engine-bumps` result fragment:

```markdown
## npm-update-engines summary

> Runtime/toolchain upgrades may include breaking changes. Review release notes and run your tests before relying on this.

**Resolved targets:**

- {engine}: {target}
- ...

**Applied ({N}):**

- {engine}: {file} ({locus}) {from} → {to}
- ...

**Dropped corepack hashes ({N}):**

- {file}: {from} → {to} (dropped {droppedHash})
- ...

**Left untouched (support / unknown / ambiguous-left):**

- {file} ({locus}) — {reason}
- ...

**Isolation:** {"none (applied in current tree)" | "<mode> — <workdir>"}

**Suggested next steps (not executed):**

- Reinstall dependencies under the new toolchain if needed.
- Run your test suite.
- Review changes (`git diff`) and commit.
```

Omit any block whose count is zero (except `Suggested next steps`, always present). The `Isolation:` line is always present. Do not run any suggested step (hard rule).

## Hard rules

- Never run tests, lint, or build.
- Never create commits or PRs (or push). Branch/worktree isolation via `update-isolation` is allowed (Step 6.5, opt-in, default `none`).
- Never modify any file on `cancel` or when every engine is excluded.
- Never modify `support` or `unknownSurfaces` loci; modify `ambiguous` loci only when the user resolved them to `runtime`.
- Always operate at engines level; ignore any user-supplied level argument. Never invoke `scan-npm-updates`, `apply-npm-updates`, or `ncu`.

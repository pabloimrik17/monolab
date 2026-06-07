---
name: apply-npm-updates
description: Use when a single-project npm update command (`/experiments:npm-update-patch`, `/experiments:npm-update-minor`, their deep variants) or the `commander-update-orchestrator` (once per project) needs to perform the mechanical apply of a fully-resolved update set — generic `package.json` bumps via `npm-check-updates`, `pnpm-workspace.yaml` catalog edits, override commands, and one install. Level-agnostic (parameterized by `target`). Also documents the caller-invoked override-resolution procedure (registry load → first-win glob match → `{version}` resolution → GENERIC/OVERRIDE_RUN/OVERRIDE_SKIP partition). Performs writes only; streams ncu/install verbatim; returns a structured result fragment and NEVER prints a consumer summary or abort message. No tests, lint, build, or commits.
---

# apply-npm-updates

The single source of truth for the **single-project npm apply mechanism**. The caller resolves conflict policy, override decisions, and `--filter` membership; this skill performs the writes and returns a structured fragment. It is parameterized solely by `target` (= the update level) — the same skill serves `patch`, `minor`, `major`, and `engines` callers identically.

Two things live here:

- **(a) A mechanical apply contract** — Steps A1–A6 below. Caller passes a fully-resolved per-project apply spec; the skill writes manifests, runs overrides, runs one install, and streams `ncu`/install/override stdout/stderr verbatim.
- **(b) A reusable override-resolution procedure** — the "Override-resolution procedure" section below. Callers that opt into overrides invoke it to turn a candidate package set into matched entries + interpolated commands + a GENERIC/OVERRIDE_RUN/OVERRIDE_SKIP partition. The interactive prompt and the resolution *scope* stay caller-owned.

## When to use

- `/experiments:npm-update-patch` / `/experiments:npm-update-minor` (shallow single-project) — caller resolves overrides via procedure (b) + its own prompt, then invokes (a) once.
- `/experiments:npm-update-deep-patch` / `/experiments:npm-update-deep-minor` (deep single-project) — caller invokes (a) once with an empty `overrideCommands` set (the deep path consults NO override registry).
- `commander-update-orchestrator` — invokes (a) **once per project** with that project's resolved spec; resolves overrides cross-project via procedure (b) + its own cross-project prompt.

The skill is meant for command-layer / skill-layer composition. It performs writes only — it does NOT scan, group, prompt for an apply path, or compose the user-facing summary.

This skill is implemented entirely with Claude Code built-in tools (`Read`, `Bash`, `Edit`, `Write`). It introduces no new runtime dependency, library, or sidecar package.

---

## Mechanical apply contract (a)

### Input spec

The caller passes a fully-resolved, single-project apply spec with exactly these fields:

| Field              | Type                                                          | Required | Notes                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packageManager`   | `"pnpm" \| "npm" \| "yarn" \| "bun" \| "deno"`                | yes      | Selects the runner prefix and the install command. Rejected if unknown.                                                                                                     |
| `cwd`              | `string` (absolute)                                           | yes      | Project root whose manifests are bumped. Every `Bash` call runs with this working directory (`cd "<cwd>" && …`) or uses absolute `--packageFile` paths. No shell-state leak. |
| `target`           | `"patch" \| "minor" \| "major" \| "engines"`                  | yes      | Passed verbatim to `ncu --target`. Rejected if unknown.                                                                                                                     |
| `cooldown`         | `string`                                                      | no       | Release-age period for `ncu --cooldown`. Omitted for `pnpm` (ncu reads `pnpm-workspace.yaml` natively).                                                                      |
| `manifestBumps`    | `Array<{ sourceFile, names: string[], includeFilter: bool }>` | no       | One `package.json` manifest per element. One `ncu` call per element.                                                                                                         |
| `catalogEdits`     | `Array<{ name, targetVersion }>`                              | no       | `pnpm-workspace.yaml` `catalog:` key edits, in-place.                                                                                                                        |
| `overrideCommands` | `Array<{ id, command }>`                                      | no       | Already-interpolated override commands, in declaration order.                                                                                                               |
| `skipInstall`      | `boolean` (default `false`)                                   | no       | When `true`, skip the final install (every accepted package was handled by an override that runs its own install).                                                          |

The spec is consumed **as-is**: the skill performs no override matching, no conflict resolution, and no `pick-subset` parsing of its own. The caller already partitioned `manifestBumps` / `catalogEdits` / `overrideCommands`.

### Step A0 — Validate before any side effect

- If `packageManager` is not one of `pnpm` / `npm` / `yarn` / `bun` / `deno`: abort with `Error: invalid packageManager "<value>". Expected pnpm|npm|yarn|bun|deno.` and perform NO `ncu`, catalog edit, override command, or install.
- If `target` is not one of `patch` / `minor` / `major` / `engines`: abort with `Error: invalid target "<value>". Expected patch|minor|major|engines.` and perform NO side effect.

Resolve the runner prefix from `packageManager`:

| `packageManager` | runner prefix                            | install command |
| ---------------- | ---------------------------------------- | --------------- |
| `pnpm`           | `pnpm dlx`                               | `pnpm install`  |
| `npm`            | `npx -y`                                 | `npm install`   |
| `yarn`           | `yarn dlx`                               | `yarn install`  |
| `bun`            | `bunx`                                   | `bun install`   |
| `deno`           | `deno run --allow-read --allow-net npm:` | `deno install`  |

Maintain an `appliedSoFar: string[]` buffer (manifest paths / catalog file already written, plus override ids executed) for failure reporting. Maintain the result accumulators `appliedGeneric: [{ name, location }]`, `appliedOverrides: [{ id, command, matchedNames }]`, `installRan: boolean`.

### Step A1 — Generic `package.json` bumps (one ncu per `manifestBumps` element)

For each `manifestBumps` element (each a distinct `package.json` `sourceFile`), invoke `npm-check-updates@21.0.2` **exactly once**:

```bash
<runner-prefix> npm-check-updates@21.0.2 \
  -p <packageManager> \
  --target <target> \
  --upgrade \
  --packageFile <sourceFile> \
  [--cooldown <cooldown>]      # include only when `cooldown` is set AND packageManager !== "pnpm"
  [--filter "<names>"]         # include only when the element's `includeFilter` is true
```

Rules:

- `-p <packageManager>` is **always** passed — mirror scan semantics and prevent ncu auto-detect drift (e.g. ncu otherwise auto-detects `deno` when a sibling `deno.json` exists, collapsing `--dep` to `['imports']` and dropping `dependencies`/`devDependencies` updates).
- `--cooldown <cooldown>` is included when `cooldown` is set and `packageManager !== "pnpm"`; omitted otherwise.
- `--filter "<names>"` is included **only** when the element's `includeFilter === true`. `<names>` = the element's `names`, joined by single spaces, double-quoted. It is a literal list — ncu treats it as exact names (see `scan-npm-updates/research/ncu-filter-spike.md`). When `includeFilter === false`, `--filter` is omitted (ncu's own detected set equals the target set for this file).
- Stream `ncu` stdout/stderr to the user verbatim so diffs are observable.

On success, append each bumped package to `appliedGeneric` (with its `location` from the caller's spec context) and push `<sourceFile>` to `appliedSoFar`.

If `ncu` exits non-zero on a manifest, **stop immediately** and return the structured failure:

```ts
{ step: "ncu", sourceFile: "<sourceFile>", exitCode: <code>, appliedSoFar: [...] }
```

Do NOT run any catalog edit, override command, or install after this point. Do NOT print a consumer-specific abort message (`Re-run …` / `Stopping the run …`) — the caller owns that copy.

### Step A2 — `pnpm-workspace.yaml` catalog edits

For each `catalogEdits` element (`name`, `targetVersion`):

- Under the top-level `catalog:` block of `<cwd>/pnpm-workspace.yaml`, locate the key matching `name`.
- Replace its value with `targetVersion`. Preserve surrounding whitespace, comments, and the order of other keys. (ncu 21.0.2 does not rewrite catalog entries — see `scan-npm-updates/research/ncu-catalog-spike.md`; this is an in-place `Edit`, NOT an `ncu` invocation.)
- Do NOT touch any consumer `package.json` entry that references `catalog:` — only `pnpm-workspace.yaml`.

On success, append the package to `appliedGeneric` (location `catalog:<key>` / the caller-supplied location) and push `pnpm-workspace.yaml` to `appliedSoFar`.

If a catalog key is unexpectedly missing, **stop immediately** and return:

```ts
{ step: "catalog", name: "<name>", exitCode: null, appliedSoFar: [...] }
```

Do NOT run any override command or install. Do NOT print a consumer abort message.

### Step A3 — Override commands (declaration order)

After every generic manifest write (A1) and catalog edit (A2) for the project has succeeded, execute each `overrideCommands` element's `command` **exactly once, in declaration order**, streaming stdout/stderr.

On success, append `{ id, command, matchedNames }` to `appliedOverrides` (the caller supplies `matchedNames` context, or the skill records the command's id) and push the entry id to `appliedSoFar`.

If any override exits non-zero, **stop immediately** and return:

```ts
{ step: "override", entryId: "<id>", exitCode: <code>, appliedSoFar: [...] }
```

Do NOT run `ncu --upgrade` as a fallback for the matched packages (leaves the tree consistent and reviewable). Do NOT run the final install on this path. Do NOT print a consumer abort message.

### Step A4 — Single install with skip rule

After all generic bumps, catalog edits, and override commands land successfully:

- If `skipInstall === true`, run **no** install command; set `installRan = false`; record that the install was delegated to the override command(s). (This is set by the caller when every accepted package was handled by an override that runs its own install and nothing was written outside the override.)
- Otherwise run **exactly one** install command for `packageManager` (per the Step A0 table). Stream the output. On success set `installRan = true`.

If the install exits non-zero, return:

```ts
{ step: "install", exitCode: <code>, appliedSoFar: [...] }
```

Do NOT print a consumer abort message.

### Step A5 — Return the structured result

On success return:

```ts
{
  appliedGeneric:   [{ name, location }, ...],   // every generically-bumped package (A1 + A2)
  appliedOverrides: [{ id, command, matchedNames }, ...],   // every override that ran (A3)
  installRan:       boolean,                      // A4
  failure:          null
}
```

On failure return the same shape with `failure` populated per the failing step (A1/A2/A3/A4) and the partial accumulators reflecting what landed before the failure.

The skill streams `ncu` / install / override stdout/stderr verbatim (observability) but prints **NO** consumer-facing summary block (`## …-<level> summary`) and **NO** consumer-specific abort copy. The caller composes those so single-project and cross-project consumers each preserve their own wording and exit semantics.

---

## Override-resolution procedure (b) — caller-invoked

Callers that opt into overrides invoke this procedure to turn a candidate package set into the inputs for the apply contract. The procedure is the **matching / version-resolution / partition algorithm only** — the interactive `run-override` / `skip-matched` / `force-generic` prompt and the *scope* of resolution (which packages, single-project vs cross-project) remain caller-owned.

### R1 — Load the registry

`Read` the override registry from the caller-supplied path (default `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`). Parse it as YAML into a list of entries under the top-level `overrides:` key. Required fields per entry: `id`, `matches`, `command`, `versionSource`. Optional: `fallbackVersionSource`, `reference`, `notes`.

If the file is missing, unreadable, fails to parse, or lacks `overrides`: emit a single-line warning `Override registry unavailable: <reason>. Proceeding without overrides.`, treat the registry as **empty**, and do NOT abort. (Graceful degradation — legacy generic-only behavior.)

### R2 — First-win glob match

For each candidate package, find the **first** entry (in declaration order) whose `matches` list includes a pattern matching the package `name`. Glob semantics:

- `*` matches any run of characters within a package name (so `@storybook/*` matches `@storybook/react` and `@storybook/addon-essentials`; `storybook-addon-*` matches `storybook-addon-themes`).
- No other glob metacharacters. Exact strings (`storybook`) match only that literal name.

Matching is first-win — a package binds to at most one entry. Candidates binding to no entry remain GENERIC. Build `MATCHED_BY_ENTRY = { entry.id → [candidates bound to this entry] }`.

### R3 — Resolve `{version}` and interpolate

For each matched entry resolve `versionSource` against the caller's candidate set (the caller passes the resolution source — the single-project accepted set, or the cross-project `proposedTarget` set):

- `target-of:<name>` → the target version of the candidate whose name equals `<name>`, prefix-stripped (`^`/`~`/`=`). Unresolved if that candidate is absent.
- `max-target-of:<glob>` → the max semver across target versions (prefix-stripped) of candidates whose names match `<glob>`. Unresolved if no candidate matches.
- `latest` → the literal string `latest`.

If `versionSource` is unresolved and `fallbackVersionSource` is defined, try it. If both fail, emit the canonical warning `Cannot resolve {version} for override {id}: neither {versionSource} nor {fallbackVersionSource} produced a value. Falling back to generic ncu --upgrade for matched packages.` (substitute the entry's fields), drop the entry from `MATCHED_BY_ENTRY`, and let its matched candidates rejoin GENERIC. Otherwise interpolate the resolved version into `command` by replacing the literal token `{version}`.

### R4 — Partition (after the caller obtains a per-entry action)

The caller raises its own `AskUserQuestion` per matched entry and records an action ∈ `{ run-override, skip-matched, force-generic }`. Given those actions, partition the candidate set into three disjoint subsets:

- `OVERRIDE_RUN` = candidates bound to a `run-override` entry — handled by the interpolated override command; excluded from generic `ncu`.
- `OVERRIDE_SKIP` = candidates bound to a `skip-matched` entry — excluded from everything.
- `GENERIC` = candidates bound to no entry, PLUS candidates bound to a `force-generic` entry, PLUS candidates whose entry was dropped in R3.

The caller then builds the apply spec: GENERIC `package.json` candidates → `manifestBumps` (set `includeFilter` when the GENERIC set for a file is a strict subset of ncu's detectable candidates — i.e. `pick-subset` partial inclusion OR any `OVERRIDE_RUN`/`OVERRIDE_SKIP` touching the file); GENERIC `pnpm-workspace.yaml` candidates → `catalogEdits`; `run-override` interpolated commands → `overrideCommands`; `skipInstall` when every accepted package was handled by `run-override` and nothing is written outside the override commands.

### Procedure scenarios

- **First-win glob**: `@storybook/react` with a first matching `storybook` entry (patterns include `@storybook/*`) binds to `storybook` and to no later entry.
- **Version fallback**: entry `versionSource: target-of:storybook`, `fallbackVersionSource: max-target-of:@storybook/*`; no `storybook` candidate present but `@storybook/react` resolves `8.1.2` → interpolate `8.1.2`.
- **Missing registry**: file absent → procedure returns empty matches, emits the `Override registry unavailable: …` warning, does NOT abort.
- **Prompt/scope not included**: the procedure returns matches / interpolated commands / partitions only; it does NOT raise the override `AskUserQuestion` itself.

---

## Level-agnostic operation

The skill contains **no** level-specific logic. Behavior is parameterized solely by `target` (passed to `ncu --target`); a `target: "minor"` invocation differs from `target: "patch"` only in the `--target` value threaded through every `ncu` call — nothing else changes.

## Hard rules

- SHALL NOT run tests, lint, or build (`vitest`, `nx test`, lint, build are never invoked).
- SHALL NOT create git commits, branches, or pull requests.
- SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- SHALL NOT run `ncu --upgrade` as a fallback after an override command fails.
- SHALL NOT read or write the override registry data file except via the read-only resolution procedure (R1).
- SHALL NOT print a consumer-facing summary heading or a consumer-specific abort message — those are caller-owned.

## See also

- `/experiments:npm-update-patch`, `/experiments:npm-update-minor` — shallow single-project consumers (procedure (b) + contract (a)).
- `/experiments:npm-update-deep-patch`, `/experiments:npm-update-deep-minor` — deep single-project consumers (contract (a), empty overrides).
- `commander-update-orchestrator` — cross-project consumer (procedure (b) cross-project + contract (a) once per project).
- `scan-npm-updates/data/pkg-upgrade-overrides.yaml` — the single, level-independent override registry consumed via procedure (b).

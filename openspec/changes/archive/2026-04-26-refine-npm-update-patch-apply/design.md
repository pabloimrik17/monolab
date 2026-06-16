## Context

The `/experiments:npm-update-patch` command (spec `experiments-plugin` lines 361–424) applies bumps by editing each `sourceFile` with one `Edit` per accepted package. Functional, but:

- The skill already preserves `^`/`~`/exact prefixes → Claude has to exactly match the previous string so as not to lose them.
- Sequential `Edit` calls burn context proportional to N.
- No guarantees about trailing commas, exotic indentation, or duplicate sections (same name in `dependencies` and `devDependencies` of poorly-hygienized repos).

In parallel, package families with official tooling (Storybook being the clearest case) lose automigrations and cross-package synchronization when bumped entry by entry.

The `scan-npm-updates` skill already runs `ncu` with `--jsonUpgraded` in read-only mode; the tool also knows how to rewrite manifests with `--upgrade`. The premise of the change is to reuse that capability in the apply phase, keep catalogs on the current path (ncu does not support them in 21.x unless the spike confirms otherwise), and add an overrides hook for cases like Storybook.

## Goals / Non-Goals

**Goals:**

- Replace the `Edit` loop in Step 6 with one `ncu --upgrade` invocation per manifest (`package.json`) when the `sourceFile` type is a normal manifest.
- Allow `pick-subset` with a literal `--filter` (space-separated list of names).
- Keep determinism between scan and apply: the apply uses the same `--target`, `--cooldown` and `minimumReleaseAge` flags resolved in the scan.
- Introduce a per-package override registry as a data file (YAML), read by the command, easily extensible (adding an entry = editing YAML).
- Storybook as the first registry entry; default action: ask the user what to do.
- Keep catalogs (`pnpm-workspace.yaml#catalog`) on the current path until a spike confirms/refutes support in ncu 21.x.
- No visible change outside Step 6 for non-registry packages in a non-catalog accepted set.

**Non-Goals:**

- Run tests, lint, build, commits (still unchanged: hard rule).
- Support named catalogs (`catalog:test`, etc.). Tracked separately (MON).
- Add more entries to the registry beyond Storybook. The change leaves the format ready; future entries go in subsequent changes.
- Write a TS script: the logic still lives in the command markdown, interpreted by Claude, with external data only for the registry.
- Automatically detect that a package "has an official codemod" (impossible heuristic without upstream telemetry). The registry is the only source of truth.

## Decisions

### Decision 1: `ncu --upgrade` per manifest for Step 6 (no edit-loop)

**Chosen.** For each `sourceFile` that is a `package.json` (not a catalog), the command runs **one** invocation:

```
<runner-prefix> npm-check-updates@21.0.2 \
  --target patch \
  --upgrade \
  --packageFile <path> \
  [--cooldown <period>]        # only when the scan used --cooldown
  [--filter "<names...>"]      # when the target set is a strict subset
                               # (pick-subset or exclusions via OVERRIDE_RUN/OVERRIDE_SKIP)
```

The runner-prefix is resolved the same way as in the scan (`pnpm dlx`, `npx -y`, `yarn dlx`, `bunx`, `deno run ...`).

Rationale:

- Reuses ncu's prefix-preservation and format-preservation logic (battle-tested upstream).
- Reduces context cost: one bash call per manifest instead of N Edit calls.
- ncu's upstream is explicit about the idempotency of `--upgrade` and in-place work.

**Alternatives considered.**

- **(A) Explicit JSON parsing of package.json and the set of version keys.** Deterministic but we would lose the prefix detection ncu already does; besides, each PM can have quirks (bun uses `dependenciesOverride`, pnpm has `pnpm.overrides`, etc.) that ncu knows.
- **(B) A single global `ncu -ws` in workspaces.** The output shape varies across versions and mixes manifests into one blob; the per-manifest invocation is predictable and aligned with what the scan already does.

### Decision 2: `--filter` with a literal space-separated list of names

**Chosen.** `pick-subset` materializes `ACCEPTED` as `"name-a name-b @scope/name-c"`. ncu documents that `--filter` accepts (a) a space-separated list, (b) a glob, or (c) a regex. To avoid accidental interpretations (for example, a name with `+` being read as regex), the command passes the literal list after a verification spike.

**Required spike (tasks §1.1):**

- Create a fixture with 3 packages with an available patch, names that include regex-significant characters (`@scope/foo`, `postcss-import`, `eslint-plugin-storybook`).
- Run `ncu --upgrade --packageFile pkg.json --filter "@scope/foo postcss-import"`.
- Confirm: only those two are rewritten; the third is untouched.
- If it fails (ncu interprets it as regex): fall back to `--filter` with N invocations (one per package), or serialize names with escaping. Record the decision in the spike.

**Alternative considered.** Use `ncu --upgrade --reject "excluded"` (the opposite option). Rejected: `pick-subset` already produces the list of accepted ones; passing accepted ones is less ambiguous than passing rejected ones when there are packages outside the scan-output that were never in play.

### Decision 3: Flag mirroring scan↔apply

The scan resolves `minimumReleaseAge` and uses `--cooldown` or delegates to ncu's read-native (pnpm). The apply MUST use exactly the same flags. Reason: the apply re-invokes ncu, which re-discovers the target. Without the same flags, a candidate filtered by age in the scan could appear as a target in the apply (TOCTOU ↑ window).

**Implementation.** The command keeps in memory the flags computed by the skill (they were already there; they are propagated explicitly to Step 6) and puts them into the apply invocation. In the pnpm case, ncu reads `pnpm-workspace.yaml` in the apply too → nothing needs to be propagated.

**Accepted trade-off.** A small TOCTOU window between scan and apply (seconds). The `minimumReleaseAge` filter already discards versions published very recently, so the real risk of drift is low.

### Decision 4: Catalogs stay on the in-memory path (with a spike)

`pnpm-workspace.yaml#catalog` is still edited by the command directly (as in the current spec). Before closing the change, a spike verifies whether ncu 21.x already knows how to rewrite catalogs.

**Required spike (tasks §1.2).**

- Fixture with a `pnpm-workspace.yaml` and an out-of-date catalog entry.
- Run `ncu --target patch --upgrade --packageFile pnpm-workspace.yaml` (or with `--packageManager pnpm`).
- Expected result (based on the reporter's issue): "no updates". If it surprisingly works, document it and extend Step 6 to catalogs.
- If it does not work: the current path (find-replace the `name:` key inside `catalog:` preserving indentation) is kept unchanged.

### Decision 5: Override registry as a YAML data file

**Location:** `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml` (user's answer: under the skill itself).

**Shape:**

```yaml
# claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml
overrides:
  - id: storybook
    matches:
      - storybook
      - "@storybook/*"
      - eslint-plugin-storybook
      - "storybook-addon-*"
    command: "npx storybook@{version} upgrade"
    versionSource: target-of:storybook    # see semantics below
    fallbackVersionSource: max-target-of:@storybook/*
    reference: https://storybook.js.org/docs/releases/upgrading
    notes: "Syncs all @storybook/* to {version} and runs automigrations."
```

**Matching semantics.**

- `matches` is a list of patterns with simple glob (`*` as wildcard). A scan package matches if its name coincides with any pattern.
- A package matches at most **one** entry (the first that coincides in declaration order).

**versionSource semantics.**

- `target-of:<name>`: uses the `targetVersion` of package `<name>` if it is in ACCEPTED; if not, falls back to `fallbackVersionSource`.
- `max-target-of:<glob>`: max semver of the `targetVersion`s of the packages matching the glob in ACCEPTED.
- `latest`: literal `latest` (for entries that accept "bump to whatever is the latest stable").

Storybook uses `target-of:storybook` with a fallback to `max-target-of:@storybook/*` because the `storybook` package is usually present; if not, the max of the remaining `@storybook/*` is used.

**Chosen format: YAML.** Alternatives: JSON (verbose for the comments that document each entry) and prose markdown inside `SKILL.md` (not parseable, hard to extend). YAML aligns with the main repo's `pnpm-workspace.yaml` and has comments.

**Reader.** The command reads the YAML with `cat <path>` + structural parsing (Claude interprets YAML natively; it does not need `yq`). If the file is missing or invalid, the command emits a warning and proceeds without the registry (legacy behavior).

### Decision 6: UX when the registry matches

Immediately after the primary prompt (`apply-all` / `pick-subset` / `cancel`) and before Step 6, if `ACCEPTED` contains packages that match some registry entry:

```
> AskUserQuestion: "<entry.id> detected in accepted set. <entry.notes>
  Suggested: <interpolated command>. What do you want to do?"

  [run-override]   → runs the override command; excludes matched packages from the ncu --upgrade flow
  [skip-matched]   → omits the matched packages (neither bumped nor override-run)
  [force-generic]  → bumps the matched packages with normal ncu --upgrade (legacy)
```

One question per entry (if there were several entries matching in a single invocation, which is a rare edge case but possible with a wide glob, N sequential questions are asked, one per entry).

**`{version}` interpolation.**

- Resolved with the entry's `versionSource` before presenting the question.
- If resolution fails (e.g. `target-of:storybook` and the package is not in ACCEPTED and there is no valid fallback): warning + skip of the override prompt (continues with legacy ncu --upgrade for the matched ones).

**Discarded alternatives.**

- **Auto-run.** Rejected: `storybook upgrade` launches automigrations and interactive prompts (depends on version); auto-running it without explicit consent breaks the principle "the command does bump + install only".
- **Silent warn-and-skip.** Rejected: it forces the user to read the final summary and run the command afterward; high friction for the happy path.

### Decision 7: Post-override, the final `<pm> install` is not run

`storybook upgrade` (and future overrides) typically manage their own install. If an override was run:

- The command does **not** run the automatic final `<pm> install` for the matched packages.
- If there are also NON-matched packages bumped by ncu, a `<pm> install` IS run at the end (the normal one).
- Rare case: all accepted ones are override-matched → no separate install; it is assumed the override did it.

This is documented in the final summary, so the user knows what was run.

## Risks / Trade-offs

- **Risk**: ncu reinterprets `--filter "a b c"` as regex in some edge case and rewrites non-accepted packages.
  **Mitigation**: spike §1.1 with a fixture that includes regex-significant characters before implementing.

- **Risk**: `ncu --upgrade` rewrites the manifest with a slightly different format than the original (ordering, indentation, trailing newline).
  **Mitigation**: document in the summary that the format may vary slightly; ncu upstream is stable regarding preservation but is not a round-trip parser. Accepted: the diff is reviewable.

- **Risk**: the Storybook override runs destructive automigrations in the user's working tree (moves code, renames files).
  **Mitigation**: the Step 6.5 question explains it in `notes`. The user decides; if they say `run-override`, they assume the consequence. The command hides nothing.

- **Risk**: the registry YAML contains errors (typo in a glob, invalid versionSource) and the command fails in an unrelated place.
  **Mitigation**: when loading the YAML, validate a minimal shape; if it fails, warning + skip registry (does not abort the whole invocation).

- **Risk**: between scan and apply someone publishes a new patch that bypasses `minimumReleaseAge`.
  **Mitigation**: flag mirroring (Decision 3); the real window is seconds. Accepted.

- **Trade-off**: the registry is a hand-maintained data file. No auto-sync with upstream (storybook-next publishes a new version → nobody updates the YAML). Accepted: the registry only dictates the command template, not versions; `{version}` comes from the scan on each invocation.

- **Trade-off**: adding future overrides (next, nx, turbo, astro) requires editing YAML + validating UX. Entries are not pre-armed; this change only establishes the format.

## Migration Plan

Does not apply as a data migration. Cutover steps:

1. Implement the spikes (tasks §1.1, §1.2) and close the decisions.
2. Edit `commands/npm-update-patch.md` with the new Step 6 and the new registry-prompt phase.
3. Create `skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml` with the Storybook seed.
4. Bump plugin version 0.6.0 → 0.7.0 in the three files (via `experiments:plugin-version-bump`).
5. Sync `openspec/specs/experiments-plugin/spec.md` via `/opsx:sync`.
6. Manual validation on monolab (same pattern as the original change) + on a fixture with Storybook installed.

No rollback needed: the old behavior (edit-loop) lives only in the previous spec; reverting the change restores the previous behavior.

## Open Questions

- **Which glob engine for `matches`?** Proposal: minimatch-like (only `*` as a literal wildcard for a name segment). A full-blown glob is not needed; the patterns are short and the prompt-instruction implementation is minimal. Confirm whether any real case needs `?` or `{a,b}` (not identified).
- **Should the override prompt also appear in `apply-all`?** Yes (decided). Any apply involving matched packages triggers the question, regardless of how they reached the accepted set.
- **What happens if the `npx storybook@X upgrade` invocation fails?** Proposal: capture exit code ≠ 0, show a clear message, do **not** run `ncu --upgrade` as a fallback (the state stays mixed). The user re-launches the command if they want.

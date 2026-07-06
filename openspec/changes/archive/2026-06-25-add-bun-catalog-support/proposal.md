## Why

The `experiments` npm-update flow (`scan-npm-updates` + `apply-npm-updates`, consumed by every `npm-update-*` / `commander-update-*` command at every level) only understands **pnpm** catalogs declared in `pnpm-workspace.yaml`. **Bun** declares catalogs in the root `package.json` (`catalog` / `catalogs.<name>`, referenced as `catalog:` / `catalog:<name>`). The scan never reads those maps, so a Bun catalog dependency is **never offered and never bumped** — the command reports "up to date" while a newer version sits in the catalog. Closes [issue #228](https://github.com/pabloimrik17/monolab/issues/228).

**Verified scope (spike, ncu@21.0.2 — the pinned version):** the issue's secondary claim — that the generic `ncu --upgrade` path rewrites a consumer's `catalog:default` reference to a pinned version, causing cross-consumer drift — **did not reproduce**. ncu skips every `catalog:*` specifier syntactically, with or without `-p bun`, and never touches the root `catalog`/`catalogs` maps ("No dependencies"). Tested with the issue's exact package (`eslint-plugin-storybook` `10.1.10`→`10.1.11`). The real, confirmed defect is therefore the **silently-missed update** (catalog source invisible to scan), not corruption or drift. Spike notes captured under `research/`.

## What Changes

- **Scan (`npm-update-scanning`):** when the detected package manager is `bun`, parse Bun catalog sources in the root `package.json` and emit catalog update records the same way the pnpm path does:
  - `catalog` (top-level or under `workspaces`) → records with `location: "catalog:default"`.
  - `catalogs.<name>` (top-level or under `workspaces`) → records with `location: "catalog:<name>"` — **the previously reserved named-catalog slot is now emitted** (Full scope, both default and named).
  - `sourceFile` is the root `package.json`; version candidates resolved via the existing `npm view` + level + `minimumReleaseAge` logic, unchanged.
- **Apply (`npm-update-apply`):** teach `catalogEdits` to bump Bun catalog entries in `package.json` (in-memory `Edit`, preserve formatting/key order), at the correct JSON node (`catalog` vs `catalogs.<name>`, top-level vs under `workspaces`). Requires enriching each `catalogEdits` element with its `sourceFile` + catalog field path so the writer is unambiguous (today it implicitly targets `pnpm-workspace.yaml#catalog`).
- **Guard (defense-in-depth, not the fix):** generalize the existing pnpm-only invariant "never rewrite a consumer `catalog:` reference" to be package-manager-agnostic, with a cheap explicit check, so a future ncu version that stops skipping `catalog:*` cannot silently regress Bun (or pnpm) consumers. No behavior change at the pinned ncu version.
- **Named catalogs:** the "named catalog detected but not yet supported" warning path is **removed for Bun** (named catalogs now fully supported). The pnpm named-catalog warning is unchanged in this iteration.
- **Hard-rule wording cascade:** the parenthetical "(only `pnpm-workspace.yaml`)" attached to the "SHALL NOT mutate a `catalog:` consumer `package.json`" rule across the command/orchestrator specs is generalized to "(only the catalog source file)".

No new runtime dependency, library, or sidecar. All edits stay within Claude Code built-in tools (`Read`/`Edit`/`Bash`). No tests/lint/build/commits added to the flow.

## Capabilities

### New Capabilities
<!-- None — this extends two existing capabilities. -->

### Modified Capabilities
- `npm-update-scanning`: detect Bun catalog sources in `package.json` (`catalog` / `catalogs.<name>`, top-level or under `workspaces`) and emit `catalog:default` / `catalog:<name>` update records with `sourceFile` = root `package.json`; drop the Bun named-catalog "unsupported" warning.
- `npm-update-apply`: extend the `catalogEdits` contract to carry `sourceFile` + catalog field path and apply Bun catalog bumps in `package.json` in-place; generalize the consumer `catalog:` non-mutation invariant to be package-manager-agnostic.

## Impact

- **Skills:** `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md` (Catalog post-processing section), `claude-plugins/experiments/skills/apply-npm-updates/SKILL.md` (Step A2 `catalogEdits` + input spec + hard rules).
- **Command/orchestrator specs & docs** carrying the catalog hard-rule wording (parenthetical generalization, no logic change): `commander-update-orchestrator-skill`, `npm-update-deep-patch-command`, `commander-update-deep-patch-command`, `commander-update-deep-minor-command`, `commander-update-minor-command`, `npm-update-major-command`, `npm-update-deep-major-command`, and the matching command `.md` files.
- **Callers inherit the fix for free:** all levels (`patch`/`minor`/`major`), both shallow and deep, single-project and `commander-*`, route through the two shared skills — no per-command logic change.
- **No breaking changes** to the pnpm path; pnpm scan/apply behavior is byte-identical.

## Open questions

- The legacy `experiments-plugin` spec still restates scan/apply/catalog requirements (lines ~172, 187–216, 294–296, 334) that overlap with `npm-update-scanning` / `npm-update-apply`. Confirm during the specs phase whether it needs a parallel delta or is superseded (see memory: out-of-order sync risk).
- Bun allows a catalog map both top-level and nested under `workspaces`. Confirm precedence/dedup rule if both are present (design.md).
- Location-string collision: a repo defining both top-level `catalog` and `catalogs.default` would map two distinct sources to `location: "catalog:default"`. Disambiguation lives in the enriched `catalogEdits` field path; confirm the scan record shape handles it (design.md).

## 1. Spike — Validate tool choice

- [x] 1.1 Run `taze` in `--json` mode on the monolab monorepo root; capture output shape and verify it detects pnpm workspace — **finding: taze 19.11.0 has no `--json` flag (upstream issue antfu-collective/taze#201 open).**
- [x] 1.2 Verify taze detects and correctly reports `catalog:` entries (vitest/jsdom/@testing-library etc.) with location pointing to `pnpm-workspace.yaml` — **finding: taze reports `catalog: → catalog:` (does not dereference).**
- [x] 1.3 Verify taze waterfall semantic on a package that has patch + minor + major available (create synthetic case if needed) — **finding: waterfall confirmed on `@types/react 19.0.0 → 19.0.14` with `(19.2.14 available)` annotation.**
- [x] 1.4 Test taze behavior against `minimumReleaseAge: 1440`: does it respect it natively, via flag, or not at all? Document exact finding. — **finding: taze has `--maturity-period [days]` but does not read pnpm's setting; ncu does read it natively.**
- [x] 1.4.1 Produce authoritative `minimumReleaseAge` lookup table (config file + key) for each supported PM: pnpm, npm, yarn, bun, deno. This table is a gating deliverable for the skill — any PM without a documented lookup SHALL be rejected by the skill at runtime until documented. — **pnpm confirmed via `pnpm-workspace.yaml#minimumReleaseAge`; npm/yarn/bun/deno documented in SKILL.md table.**
- [x] 1.5 Repeat 1.1–1.4 with `ncu` (`--target patch`, `--cooldown`, `-ws`) on the same repo; document divergences — **finding: ncu has stable `--jsonUpgraded`; auto-reads pnpm `minimumReleaseAge`; cap semantic on `--target patch`.**
- [x] 1.6 Run both tools on a single-repo fixture (no workspace, no catalogs) and confirm output parity for the patch use case — **finding: ncu reported chalk/lodash patches; taze reported "up-to-date" (divergence in taze's favor of ncu).**
- [x] 1.7 Write `research/taze-vs-ncu.md` inside the change folder with evidence table, command logs, and final decision (confirm taze or fall back to ncu with rationale) — **written.**
- [x] 1.8 Pin the exact tool version — **decision pivoted to `npm-check-updates@21.0.2`.**

## 2. Skill `scan-npm-updates`

- [x] 2.1 Create directory `claude-plugins/experiments/skills/scan-npm-updates/`
- [x] 2.2 Create `SKILL.md` with YAML frontmatter: `name: scan-npm-updates`, `description: <triggering description per skill-development best practices>`
- [x] 2.3 Write detection section: package manager (pnpm/npm/yarn/bun/deno) from lockfile + `packageManager` field
- [x] 2.4 Write detection section: repo type (single vs workspace)
- [x] 2.5 Write dlx-runner resolution (`pnpm dlx` / `npx` / `yarn dlx` / `bunx`) with PATH check and abort message if missing
- [x] 2.6 Write tool invocation with pinned version (`npm-check-updates@21.0.2`) and `--jsonUpgraded` flag, parameterized by `level`
- [x] 2.7 Write `minimumReleaseAge` handling (native via ncu for pnpm; `--cooldown` for others; documented lookup table)
- [x] 2.8 Write catalog post-processing: resolve `catalog:` entries against `pnpm-workspace.yaml#catalog` and emit updates with `location: "catalog:default"` and `sourceFile: "pnpm-workspace.yaml"`
- [x] 2.9 Write warning emission for named catalogs (`catalog:test`, etc.) listing them as "not yet supported"
- [x] 2.10 Write the output JSON shape contract with example
- [x] 2.11 Write abort paths: missing dlx, tool invocation failure, JSON parse failure

## 3. Command `npm-update-patch`

- [x] 3.1 Create `claude-plugins/experiments/commands/npm-update-patch.md` with YAML frontmatter `description`
- [x] 3.2 Write skill invocation: call `scan-npm-updates` with `level=patch`
- [x] 3.3 Write empty-updates branch: print "No patch updates available" and exit
- [x] 3.4 Write table renderer: `name | currentVersion → targetVersion | location`
- [x] 3.5 Write primary `AskUserQuestion` with options `apply-all | pick-subset | cancel`
- [x] 3.6 Write `pick-subset` sub-flow: prompt for exclusion names, validate against the updates list, re-prompt on unknown names
- [x] 3.7 Write apply loop: bump each accepted update in its `sourceFile` (handle `package.json` and `pnpm-workspace.yaml` paths)
- [x] 3.8 Write single install step using the detected PM
- [x] 3.9 Write final summary: applied list, skipped list, suggested-next-steps message (tests/lint/commit) explicitly noting they are NOT executed
- [x] 3.10 Write cancel branch: exit without touching files

## 4. Plugin version bump

- [x] 4.1 Confirm authoritative baseline: `plugin.json` at `0.5.0` (package.json matches; marketplace.json experiments entry is stale at `0.4.1`)
- [x] 4.2 Set all three to `0.6.0`: `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, and the `experiments` entry in `.claude-plugin/marketplace.json` (the bump reconciles the stale marketplace entry)
- [x] 4.3 Verify all three files report exactly `0.6.0`

## 5. Spec reconciliation

- [x] 5.1 Sync `openspec/specs/experiments-plugin/spec.md` with the ADDED Requirements from this change's delta (via `openspec sync` or manual `/opsx:sync`) — **manual merge; validated via `openspec spec validate experiments-plugin`.**

## 6. Manual validation on monolab

- [x] 6.1 With the new command installed, run `/experiments:npm-update-patch` against the monolab workspace
- [x] 6.2 Confirm patches are detected for catalog and non-catalog packages
- [x] 6.3 Exercise `apply-all` on a safe subset (or dry-run by copying workspace) and verify `pnpm-workspace.yaml` and package.json edits are correct
- [x] 6.4 Exercise `pick-subset` excluding one package; verify only the rest got bumped
- [x] 6.5 Exercise `cancel`; verify zero file changes
- [x] 6.6 Run `pnpm install` manually after and confirm lockfile updates cleanly

## 7. Manual validation on non-pnpm project (smoke)

- [x] 7.1 Clone or scaffold a minimal npm single-repo fixture with at least one patch available
- [x] 7.2 Run `/experiments:npm-update-patch`; confirm `npm install` path works and output parity

## 8. Documentation

- [x] 8.1 Update `claude-plugins/experiments/README.md` listing the new command and skill
- [x] 8.2 Add brief note in the command file referencing `/experiments:npm-changelog` as a natural next step before applying

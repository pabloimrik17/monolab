## 1. Spike — Validate tool choice

- [ ] 1.1 Run `taze` in `--json` mode on the monolab monorepo root; capture output shape and verify it detects pnpm workspace
- [ ] 1.2 Verify taze detects and correctly reports `catalog:` entries (vitest/jsdom/@testing-library etc.) with location pointing to `pnpm-workspace.yaml`
- [ ] 1.3 Verify taze waterfall semantic on a package that has patch + minor + major available (create synthetic case if needed)
- [ ] 1.4 Test taze behavior against `minimumReleaseAge: 1440`: does it respect it natively, via flag, or not at all? Document exact finding.
- [ ] 1.4.1 Produce authoritative `minimumReleaseAge` lookup table (config file + key) for each supported PM: pnpm, npm, yarn, bun, deno. This table is a gating deliverable for the skill — any PM without a documented lookup SHALL be rejected by the skill at runtime until documented.
- [ ] 1.5 Repeat 1.1–1.4 with `ncu` (`--target patch`, `--cooldown`, `-ws`) on the same repo; document divergences
- [ ] 1.6 Run both tools on a single-repo fixture (no workspace, no catalogs) and confirm output parity for the patch use case
- [ ] 1.7 Write `research/taze-vs-ncu.md` inside the change folder with evidence table, command logs, and final decision (confirm taze or fall back to ncu with rationale)
- [ ] 1.8 If decision is taze: pin the exact version to use in the skill (e.g., `taze@x.y.z`); if ncu, pin likewise

## 2. Skill `scan-npm-updates`

- [ ] 2.1 Create directory `claude-plugins/experiments/skills/scan-npm-updates/`
- [ ] 2.2 Create `SKILL.md` with YAML frontmatter: `name: scan-npm-updates`, `description: <triggering description per skill-development best practices>`
- [ ] 2.3 Write detection section: package manager (pnpm/npm/yarn/bun/deno) from lockfile + `packageManager` field
- [ ] 2.4 Write detection section: repo type (single vs workspace)
- [ ] 2.5 Write dlx-runner resolution (`pnpm dlx` / `npx` / `yarn dlx` / `bunx`) with PATH check and abort message if missing
- [ ] 2.6 Write tool invocation with pinned version and `--json` flag, parameterized by `level`
- [ ] 2.7 Write `minimumReleaseAge` handling (native flag if available, otherwise post-process filter using `npm view <pkg> time`)
- [ ] 2.8 Write catalog post-processing: if a reported update targets a consumer `package.json` that uses `catalog:`, rewrite the `location` and `sourceFile` to point to `pnpm-workspace.yaml`
- [ ] 2.9 Write warning emission for named catalogs (`catalog:test`, etc.) listing them as "not yet supported"
- [ ] 2.10 Write the output JSON shape contract with example
- [ ] 2.11 Write abort paths: missing dlx, tool invocation failure, JSON parse failure

## 3. Command `npm-update-patch`

- [ ] 3.1 Create `claude-plugins/experiments/commands/npm-update-patch.md` with YAML frontmatter `description`
- [ ] 3.2 Write skill invocation: call `scan-npm-updates` with `level=patch`
- [ ] 3.3 Write empty-updates branch: print "No patch updates available" and exit
- [ ] 3.4 Write table renderer: `name | currentVersion → targetVersion | location`
- [ ] 3.5 Write primary `AskUserQuestion` with options `apply-all | pick-subset | cancel`
- [ ] 3.6 Write `pick-subset` sub-flow: prompt for exclusion names, validate against the updates list, re-prompt on unknown names
- [ ] 3.7 Write apply loop: bump each accepted update in its `sourceFile` (handle `package.json` and `pnpm-workspace.yaml` paths)
- [ ] 3.8 Write single install step using the detected PM
- [ ] 3.9 Write final summary: applied list, skipped list, suggested-next-steps message (tests/lint/commit) explicitly noting they are NOT executed
- [ ] 3.10 Write cancel branch: exit without touching files

## 4. Plugin version bump

- [ ] 4.1 Confirm authoritative baseline: `plugin.json` at `0.5.0` (package.json matches; marketplace.json experiments entry is stale at `0.4.1`)
- [ ] 4.2 Set all three to `0.6.0`: `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, and the `experiments` entry in `.claude-plugin/marketplace.json` (the bump reconciles the stale marketplace entry)
- [ ] 4.3 Verify all three files report exactly `0.6.0`

## 5. Spec reconciliation

- [ ] 5.1 Sync `openspec/specs/experiments-plugin/spec.md` with the ADDED Requirements from this change's delta (via `openspec sync` or manual `/opsx:sync`)

## 6. Manual validation on monolab

- [ ] 6.1 With the new command installed, run `/experiments:npm-update-patch` against the monolab workspace
- [ ] 6.2 Confirm patches are detected for catalog and non-catalog packages
- [ ] 6.3 Exercise `apply-all` on a safe subset (or dry-run by copying workspace) and verify `pnpm-workspace.yaml` and package.json edits are correct
- [ ] 6.4 Exercise `pick-subset` excluding one package; verify only the rest got bumped
- [ ] 6.5 Exercise `cancel`; verify zero file changes
- [ ] 6.6 Run `pnpm install` manually after and confirm lockfile updates cleanly

## 7. Manual validation on non-pnpm project (smoke)

- [ ] 7.1 Clone or scaffold a minimal npm single-repo fixture with at least one patch available
- [ ] 7.2 Run `/experiments:npm-update-patch`; confirm `npm install` path works and output parity

## 8. Documentation

- [ ] 8.1 Update `claude-plugins/experiments/README.md` listing the new command and skill
- [ ] 8.2 Add brief note in the command file referencing `/experiments:npm-changelog` as a natural next step before applying

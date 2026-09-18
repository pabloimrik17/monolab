# Changeset: dotfiles (deep-minor)

## Applicable (0)

None. This repo is a minimal dotfiles workspace: `private: true`, `type: module`, all
dependencies are `devDependencies` (no production `dependencies` block, no runtime entry
point), and the only source is three tiny tool-config files (`commitlint.config.ts`,
`lint-staged.config.ts`, `oxfmt.config.ts`). Every in-scope improvement is either delivered
automatically by the version bump, is a read-only CLI/MCP tool, or has nothing in this repo
to act on. No concrete, reviewer-acceptable edit exists for any of the 12 bullets.

## Inapplicable (12)

- @commitlint/cli — resolve-extends resolves pure-ESM presets — `commitlint.config.ts` cleanly `extends` only the first-party `@commitlint/config-conventional` and already resolves; no ESM-only shareable preset is in use and no workaround is present to drop.
- fallow — [high] new dev-dependency-in-production rule — repo has no production `dependencies` and no runtime entry point (all deps are devDependencies, `private: true`), so the rule has nothing to guard; no config edit lands.
- fallow — configurable health.maxUnitSize function-size threshold — source is three tiny config files with no function anywhere near the 60-LOC default, so there is no oversized unit to tune around.
- fallow — new `fallow recommend` cold-start onboarding surface — read-only onboarding command; the project already has a curated `.fallowrc.jsonc`, so it produces no file edit.
- fallow — stronger/cheaper CI integration (sticky comments, Check Run, fork-safe annotations, report --from) — `fallow.yml` already opts into `comment: true` / `comment-layout: compact`; sticky-comment and Check Run behavior arrive automatically on the action upgrade, and fork-safe annotations are moot for this single-owner repo — no concrete action-input change is warranted.
- fallow — install/runtime efficiency (single multicall binary, faster analysis) — automatic install-size/perf win delivered by the `fallow@3.6.0` bump; no source change.
- fallow — self-documenting schema / config-schema — `.fallowrc.jsonc` already references `"$schema": "./node_modules/fallow/schema.json"`; the richer key descriptions ship with the version bump, requiring no edit.
- fallow — new governance/reporting surfaces (suppressions, impact_closure, plugin-check) — new read-only CLI/MCP surfaces; using them requires no config or CI change in this repo.
- fallow — machine-consumer ergonomics (--format json compact + --pretty, typed ErrorOutput) — no fallow `--format json` output is consumed anywhere in this repo's scripts or CI, so there is nothing to adjust.
- lint-staged — much smaller install footprint (Listr2 removed) — automatic supply-chain/install-size win from the `lint-staged@17.1.0` bump; no config change.
- lint-staged — simpler console output — automatic behavior change delivered by the version bump; no config change.
- lint-staged — more consistent color handling — automatic behavior change delivered by the version bump; no config change.

## Summary

applicable: 0
inapplicable: 12

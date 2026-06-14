## ADDED Requirements

### Requirement: Engines-level scan/apply routing

When the orchestrator's `level` (and `target`) is `engines`, it SHALL route the per-project scan and apply steps to the engine toolchain skills instead of the dependency skills, while reusing the rest of the cross-project skeleton (project resolution, subset selection, plan rendering, sequential apply with stop-on-fail, aggregated summary). Specifically, for `level=engines`:

- The per-project **scan** step SHALL invoke `detect-toolchain-surfaces` (capability `engine-surface-scanning`) instead of `scan-npm-updates`.
- The per-project **apply** step SHALL invoke `apply-engine-bumps` (capability `engine-update-apply`) instead of `npm-update-apply`. No `ncu` is invoked at engines level.
- **Cross-project alignment** SHALL be on the resolved **engine version** (one target per engine, resolved once and reused for every project — Node→latest LTS, pnpm/npm/yarn/bun/deno→latest), rather than per-package max-wins. A project already pinned above the target SHALL be surfaced and left higher unless the user opts to converge.
- The override-registry consultation step (package-name overrides) SHALL be skipped for engines (it has no meaning for runtime/PM surfaces).

For `level ∈ {patch, minor, major}` this requirement is inert — those levels continue to use `scan-npm-updates` / `npm-update-apply` exactly as before.

#### Scenario: Engines routes to the engine skills

- **WHEN** the orchestrator runs with `level: "engines"`
- **THEN** each project is scanned via `detect-toolchain-surfaces` and applied via `apply-engine-bumps`, and `scan-npm-updates`/`npm-update-apply`/`ncu` are not invoked

#### Scenario: Cross-project alignment on engine version

- **WHEN** several projects pin different current Node versions and the resolved target is one LTS
- **THEN** the orchestrator aligns every project's runtime surfaces to that single resolved version (not a per-package max-wins computation)

#### Scenario: Dependency levels unaffected

- **WHEN** the orchestrator runs with `level: "patch"`, `"minor"`, or `"major"`
- **THEN** it behaves exactly as before (dependency scan/apply via `scan-npm-updates`/`npm-update-apply`), with no engine routing

### Requirement: Deep engines-level research routing

When `level=engines` and `mode=deep`, the orchestrator's deep-mode research insertion SHALL invoke `parallel-research-workflow` with `level=engines` (so research targets engine release notes, deduplicated once per engine/version) and SHALL surface the resulting `plan.md` — including its `## Breaking changes & migration` and `## Changelogs` sections — through the existing deep-mode plan rendering. No `## PR plan` / `partition-breaking-changes` section applies at engines level.

#### Scenario: Deep engines uses engine release-note research

- **WHEN** the orchestrator runs with `level: "engines"`, `mode: "deep"`
- **THEN** it invokes `parallel-research-workflow` with `level=engines` and surfaces the `## Breaking changes & migration` + `## Changelogs` sections, with no `## PR plan` section

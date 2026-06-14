## ADDED Requirements

### Requirement: Command location, frontmatter, and major-level deep contract

The `experiments` plugin SHALL include a slash command at `claude-plugins/experiments/commands/npm-update-deep-major.md` with YAML frontmatter declaring a non-empty `description` field, invocable as `/experiments:npm-update-deep-major`. It is the deep single-project sibling of `/experiments:npm-update-deep-minor`. The command SHALL operate exclusively at **major level**: it always passes `level=major` to `scan-npm-updates` and to `parallel-research-workflow`, and ignores any user-supplied level argument.

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** the file `npm-update-deep-major.md` SHALL exist
- **AND** SHALL contain YAML frontmatter with a non-empty `description` field

#### Scenario: Empty result short-circuits before research

- **WHEN** `scan-npm-updates` returns zero major updates
- **THEN** the command prints `No major updates available.` and exits without grouping, dispatching the workflow, or creating a plan directory

### Requirement: Deep research at major level with breaking-change weighting

The command SHALL invoke `parallel-research-workflow` with `{ groups, level: "major", scanResult }` in single-project mode. The produced `plan.md` SHALL include a `## Major bump set` table, a `## Breaking changes & migration` section, and a `## Changelogs` chronology section. The command SHALL surface workflow progress and SHALL NOT dispatch subagents itself.

#### Scenario: Plan carries the major-specific sections

- **WHEN** the workflow returns successfully
- **THEN** `plan.md` contains `## Major bump set`, `## Breaking changes & migration`, and `## Changelogs`

### Requirement: User-gated apply, bumps via npm-update-apply (generic-only)

The command SHALL raise the `apply-all` / `apply-bumps-only` / `pick-subset` / `cancel` gate exactly once. For `apply-all`/`apply-bumps-only`/`pick-subset`(with bumps) it SHALL apply bumps by invoking `npm-update-apply` once with `target: "major"` and an **empty** `overrideCommands` set (the deep path consults NO override registry). For `apply-all`, applicable improvements **and** breaking-change/migration items from `plan.md` SHALL be applied via Claude Code plan mode (reconnaissance → `EnterPlanMode` preview → user-gated edits). On plan-mode rejection, already-applied bumps are preserved (no rollback). The summary heading SHALL be `## npm-update-deep-major summary`.

#### Scenario: Bumps delegated to npm-update-apply at major, no overrides

- **WHEN** the user picks `apply-all` or `apply-bumps-only`
- **THEN** the command invokes `npm-update-apply` once with `target: "major"`, `overrideCommands: []`, which maps to `ncu --target latest` with `--filter` always applied
- **AND** no override registry is loaded

#### Scenario: Breaking-change items flow through the reviewed plan-mode round

- **WHEN** `apply-all` is selected and `plan.md` lists breaking-change/migration items
- **THEN** those items are presented in the `EnterPlanMode` document alongside improvements, and applied only on user approval — never silently

#### Scenario: Plan-mode rejection preserves bumps

- **WHEN** the user rejects the plan-mode round after bumps already landed
- **THEN** bumps are preserved, no improvement or migration edits are applied, and the rejection notice is surfaced

### Requirement: Hard rules

The command SHALL NOT run tests/lint/build; SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel`; SHALL NOT mutate a `catalog:` consumer `package.json` (only `pnpm-workspace.yaml`); SHALL NOT consult the override registry; SHALL NOT expand the plan-mode round beyond bullets present in `plan.md`; SHALL ignore any user-supplied level and always pass `level=major`. Cleanup SHALL be delegated to `parallel-research-workflow` (single `delete-plan`/`keep-plan` prompt).

#### Scenario: Deep path never consults overrides

- **WHEN** the command builds the apply spec
- **THEN** `overrideCommands` is empty and no override registry is read

### Requirement: Breaking-change PR grouping and per-bucket isolation

After research, the command SHALL invoke `partition-breaking-changes` to group the accepted major set into buckets and SHALL surface a `## PR plan` section (ordered buckets + count-by-policy summary). The command SHALL offer an opt-in isolation gate. When isolation is chosen, for each bucket the command SHALL call `update-isolation` (worktree-preferred) and apply that bucket's bumps + migration edits into the bucket's workdir, then list each bucket → branch/worktree path in the summary with `Suggested next steps` (commit/push/PR — NOT executed). When isolation is `none`, all accepted buckets apply in the current tree (PR plan remains advisory).

#### Scenario: PR plan surfaced

- **WHEN** research yields ≥1 breaking-change set
- **THEN** the surfaced plan includes a `## PR plan` section with ordered buckets and a count-by-policy summary

#### Scenario: High-risk package isolated to its own worktree

- **WHEN** isolation is chosen and a HIGH-risk set (e.g. the React major + peer set) is one of the buckets
- **THEN** that bucket is applied into its own worktree containing only that bucket's diff, and no commit/push/PR is performed

#### Scenario: Isolation none keeps current behavior

- **WHEN** the user leaves isolation at `none`
- **THEN** all accepted buckets apply in the current working tree and the `## PR plan` is advisory only

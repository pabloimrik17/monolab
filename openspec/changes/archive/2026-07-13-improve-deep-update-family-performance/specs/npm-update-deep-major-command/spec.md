## MODIFIED Requirements

### Requirement: Deep research at major level with breaking-change weighting

The command SHALL invoke `parallel-research-workflow` with `{ groups, level: "major", scanResult }` in single-project mode. The produced `dossier.md` SHALL include a `## Major bump set` table, a `## Breaking changes & migration` section, and a script-assembled `## Changelogs` chronology section. The command SHALL surface workflow progress and SHALL NOT dispatch subagents itself.

#### Scenario: Dossier carries the major-specific sections

- **WHEN** the workflow returns successfully
- **THEN** `dossier.md` contains `## Major bump set`, `## Breaking changes & migration`, and `## Changelogs`

### Requirement: User-gated apply, bumps via npm-update-apply (generic-only)

The command SHALL raise the `apply-all` / `apply-bumps-only` / `pick-subset` / `cancel` gate exactly once, after surfacing the dossier by path plus a bounded digest. For `apply-all`/`apply-bumps-only`/`pick-subset`(with bumps) it SHALL apply bumps by invoking `apply-npm-updates` exactly once per bucket-or-set — one invocation over the whole accepted set when isolation is `none`, or one invocation per bucket into that bucket's workdir (in `suggestedMergeOrder`) under `per-bucket-worktree` isolation — each with `target: "major"` and an **empty** `overrideCommands` set (the deep path consults NO override registry), with output redirected to on-disk logs per that skill's contract. For `apply-all`, applicable improvements **and** breaking-change/migration items from `dossier.md` SHALL be applied through the per-project changeset gate (apply-teammate reconnaissance → `changeset.md` → pre-gate check → orchestrator-owned human gate → teammate applies on approval, per the experiments-plugin gate requirements). On gate rejection, already-applied bumps are preserved (no rollback). The summary heading SHALL be `## npm-update-deep-major summary`.

#### Scenario: Breaking-change items flow through the gated changeset

- **WHEN** `apply-all` is selected and `dossier.md` lists breaking-change/migration items
- **THEN** those items are presented in `changeset.md` alongside improvements, and applied by the teammate only on user approval — never silently

#### Scenario: Gate rejection preserves bumps

- **WHEN** the user rejects the changeset after bumps already landed
- **THEN** bumps are preserved, no improvement or migration edits are applied, and the rejection notice is surfaced

### Requirement: Hard rules

The command SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel`; SHALL NOT mutate a `catalog:` consumer `package.json` (only `pnpm-workspace.yaml`); SHALL NOT consult the override registry; SHALL NOT expand the changeset gate round beyond bullets present in `dossier.md`; SHALL ignore any user-supplied level and always pass `level=major`. The command stops for human-in-the-loop review before any commit/push/PR. Cleanup SHALL be delegated to `parallel-research-workflow` (single `delete-plan`/`keep-plan` prompt).

#### Scenario: Changeset gate scoped to the dossier

- **WHEN** the changeset gate round runs
- **THEN** `changeset.md` contains only items present in `dossier.md`, with no scope expansion

### Requirement: Breaking-change PR grouping and per-bucket isolation

After research, the command SHALL invoke `partition-breaking-changes` to group the accepted major set into buckets and SHALL append a `## PR plan` section to the surfaced digest (ordered buckets + count-by-policy summary; the section name `## PR plan` is a retained legacy name — see the deep-update artifact glossary carve-outs). The command SHALL offer an opt-in isolation gate. When isolation is chosen, for each bucket the command SHALL call `update-isolation` (worktree-preferred) and apply that bucket's bumps + migration edits into the bucket's workdir, then list each bucket → branch/worktree path in the summary with `Suggested next steps` (commit/push/PR — NOT executed). When isolation is `none`, all accepted buckets apply in the current tree (PR plan remains advisory).

#### Scenario: PR plan surfaced

- **WHEN** research yields ≥1 breaking-change set
- **THEN** the surfaced dossier digest includes the `## PR plan` section with ordered buckets and a count-by-policy summary

#### Scenario: High-risk package isolated to its own worktree

- **WHEN** isolation is chosen and a HIGH-risk set (e.g. the React major + peer set) is one of the buckets
- **THEN** that bucket is applied into its own worktree containing only that bucket's diff, and no commit/push/PR is performed

#### Scenario: Isolation none keeps current behavior

- **WHEN** the user leaves isolation at `none`
- **THEN** all accepted buckets apply in the current working tree and the `## PR plan` is advisory only

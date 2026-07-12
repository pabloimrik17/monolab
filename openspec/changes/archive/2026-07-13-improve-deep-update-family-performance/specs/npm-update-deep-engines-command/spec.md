## MODIFIED Requirements

### Requirement: Command location, frontmatter, and deep engines-level contract

The `experiments` plugin SHALL include a slash command at `claude-plugins/experiments/commands/npm-update-deep-engines.md` with YAML frontmatter declaring a non-empty `description`, invocable as `/experiments:npm-update-deep-engines`. The command SHALL operate exclusively at **engines level** with deep research: it drives `detect-toolchain-surfaces` → engine release-note research (via `parallel-research-workflow` with `level=engines`) → user-gated `apply-engine-bumps` + migration edits through the changeset gate. It SHALL NOT invoke `scan-npm-updates`/`apply-npm-updates`/`ncu`. It is the deep single-project sibling of `/experiments:npm-update-deep-major`.

#### Scenario: Engines-level deep flow, no ncu

- **WHEN** the command runs
- **THEN** it detects surfaces, runs research over engine release notes, and never invokes `ncu` or the dependency scan/apply skills

### Requirement: Deep research over engine release notes with breaking-change synthesis

The command SHALL invoke `parallel-research-workflow` with `level=engines` so research targets **engine release notes** (Node/pnpm/npm/yarn/Deno/Bun), deduplicated once per engine/version. The produced `dossier.md` SHALL include the `## Breaking changes & migration` section (populated from engine release notes) and the script-assembled `## Changelogs` chronology section. Breaking-change and migration items SHALL be presented as candidate edits in `changeset.md` through the per-project changeset gate, applied by the apply teammate only on user approval.

#### Scenario: Dossier carries engine breaking-changes section

- **WHEN** a Node major bump removes an API or flag
- **THEN** the dossier's `## Breaking changes & migration` section describes it (sourced from the Node release notes) and it is offered as a candidate migration edit in the changeset

#### Scenario: Changelogs sourced from engine notes

- **WHEN** `dossier.md` is synthesized for the engines level
- **THEN** the `## Changelogs` section links engine release notes rather than npm package changelogs

### Requirement: Apply via apply-engine-bumps; gated migration edits

After the gate, the command SHALL invoke `apply-engine-bumps` once with the confirmed targets, then run the changeset gate round for approved breaking-change/migration items (apply-teammate reconnaissance → `changeset.md` → pre-gate check → orchestrator-owned human gate → teammate applies on approval, per the experiments-plugin gate requirements). On gate rejection, already-applied bumps are preserved (not reverted) and no migration edit is applied. The summary heading SHALL be `## npm-update-deep-engines summary`.

#### Scenario: Bumps then gated migration edits

- **WHEN** the user accepts bumps and approves the changeset
- **THEN** `apply-engine-bumps` writes the pinned targets and the approved migration edits are applied by the teammate through the gated changeset mechanism

#### Scenario: Gate rejection preserves bumps

- **WHEN** the user rejects the changeset after bumps landed
- **THEN** the bumps are preserved and no migration edit is applied

### Requirement: Hard rules

The command SHALL NOT create commits, push, or open PRs (branch/worktree isolation via `update-isolation` is permitted); SHALL NOT modify files on `cancel`; SHALL NOT modify `support`/`unknownSurfaces` loci; SHALL NOT expand the changeset gate round beyond items present in `dossier.md`. The command stops for human-in-the-loop review before any commit/push/PR. `partition-breaking-changes` (PR bucketing) does NOT apply at engines level — an engine bump is a single coordinated co-upgrade.

#### Scenario: No PR partition at engines level

- **WHEN** the deep-engines dossier is rendered
- **THEN** it contains no `## PR plan` section (partition is not applicable to a single coordinated engine bump)

## ADDED Requirements

### Requirement: Command location, frontmatter, and engines-level contract

The `experiments` plugin SHALL include a slash command at `claude-plugins/experiments/commands/npm-update-engines.md` with YAML frontmatter declaring a non-empty `description`, invocable as `/experiments:npm-update-engines`. The command SHALL operate exclusively at **engines level** (runtime/package-manager toolchain bump): it always drives `detect-toolchain-surfaces` + `apply-engine-bumps`, never `scan-npm-updates`/`apply-npm-updates`/`ncu`, and ignores any user-supplied level argument. It is the shallow single-project sibling of `/experiments:npm-update-major`.

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** the file `npm-update-engines.md` SHALL exist with YAML frontmatter and a non-empty `description`

#### Scenario: Level is fixed at engines; no ncu

- **WHEN** the user invokes `/experiments:npm-update-engines patch`
- **THEN** the command ignores the stray `patch` argument, runs `detect-toolchain-surfaces`, and never invokes `scan-npm-updates` or `ncu`

### Requirement: Detect, classify, resolve, and gate

The command SHALL invoke `detect-toolchain-surfaces`, surface any abort verbatim, and when no runtime surface is out of date print exactly `No engine updates available.` and exit without prompting. Otherwise it SHALL resolve the per-engine targets (via `apply-engine-bumps` resolution: Node→latest LTS, others→latest), render the detected runtime surfaces and proposed targets (grouped by engine), resolve any `ambiguous` locus via an `AskUserQuestion` (defaulting to leave), and raise an `apply-all` / `pick-subset` / `cancel` gate. The gate prompt SHALL carry a one-line breaking-changes caution for runtime/toolchain upgrades.

#### Scenario: Empty result

- **WHEN** every detected runtime surface already matches the resolved target
- **THEN** the command prints `No engine updates available.` and exits without prompting

#### Scenario: Ambiguity prompt before apply

- **WHEN** detection flags an `ambiguous` locus (e.g. a publishable package with an exact `engines.node`)
- **THEN** the command asks the user whether that locus is runtime (pin) or support (leave) before applying, defaulting to leave

#### Scenario: Breaking-changes caution shown

- **WHEN** the gate is presented with ≥1 engine update
- **THEN** the prompt includes a caution that runtime/toolchain upgrades may include breaking changes and recommends reviewing release notes before applying

### Requirement: Apply via apply-engine-bumps

For `apply-all` and `pick-subset`, the command SHALL invoke `apply-engine-bumps` exactly once with the confirmed targets and the resolved runtime surface set; it SHALL NOT restate the rewrite recipe inline and SHALL NOT touch `support` loci. The summary heading SHALL be `## npm-update-engines summary`; abort copy SHALL reference `/experiments:npm-update-engines`.

#### Scenario: Apply delegates to apply-engine-bumps

- **WHEN** the user accepts at the gate
- **THEN** the command invokes `apply-engine-bumps` once with the confirmed targets, and writes no version itself

#### Scenario: Support ranges never bumped

- **WHEN** the project contains a publishable lib `engines.node` range
- **THEN** that range is not modified by the run

### Requirement: Hard rules

The command SHALL NOT run tests, lint, or build; SHALL NOT create commits, push, or open PRs; SHALL NOT modify files on `cancel`; SHALL NOT modify `support` or `unknownSurfaces` loci; SHALL always operate at engines level and ignore any user-supplied level. The command MAY offer an opt-in isolation gate delegating branch/worktree creation to `update-isolation` (default `none`); creating an isolation branch/worktree is permitted, committing/pushing/PR-ing is not.

#### Scenario: Optional isolation creates a workspace but never commits

- **WHEN** the user opts into isolation
- **THEN** the command calls `update-isolation` to create the branch/worktree, applies bumps in the resolved workdir, and performs no commit, push, or PR

#### Scenario: Cancel touches nothing

- **WHEN** the user selects `cancel`
- **THEN** no file is modified and the command exits

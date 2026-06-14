## ADDED Requirements

### Requirement: Command location, frontmatter, and major-level contract

The `experiments` plugin SHALL include a slash command at `claude-plugins/experiments/commands/npm-update-major.md` with YAML frontmatter declaring a non-empty `description` field, invocable as `/experiments:npm-update-major`. The command SHALL operate exclusively at **major level**: it always passes `level=major` to `scan-npm-updates` and `target: "major"` to `npm-update-apply`, and ignores any user-supplied level argument. It is the shallow single-project sibling of `/experiments:npm-update-minor`.

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** the file `npm-update-major.md` SHALL exist
- **AND** SHALL contain YAML frontmatter with a non-empty `description` field

#### Scenario: Level is fixed at major

- **WHEN** the user invokes `/experiments:npm-update-major patch`
- **THEN** the command ignores the stray `patch` argument and scans with `level=major`

### Requirement: Scan, render, and gate

The command SHALL invoke `scan-npm-updates` with `level=major`, surface any abort message verbatim, and on `updates.length === 0` print warnings (if any) then exactly `No major updates available.` and exit without prompting. Otherwise it SHALL render the bump table (sorted by `location` then `name`) and raise the `apply-all` / `pick-subset` / `cancel` gate via `AskUserQuestion`. The prompt SHALL carry a one-line breaking-changes caution.

#### Scenario: Empty result

- **WHEN** `scan-npm-updates` returns zero major updates
- **THEN** the command prints `No major updates available.` and exits without prompting

#### Scenario: Breaking-changes caution shown at the gate

- **WHEN** the gate is presented with ≥1 major update
- **THEN** the prompt includes a caution that major updates may include breaking changes and recommends reviewing changelogs before applying

### Requirement: Apply via npm-update-apply with the major target

For `apply-all` and `pick-subset`, after the override-resolution procedure (R1–R4 of `npm-update-apply`, command-owned prompt), the command SHALL build the resolved apply spec and invoke `npm-update-apply` exactly once with `target: "major"`. The command SHALL NOT restate the `ncu`/catalog/install recipe inline. The summary heading SHALL be `## npm-update-major summary`; abort copy SHALL reference `/experiments:npm-update-major`.

#### Scenario: Apply delegates to npm-update-apply at major

- **WHEN** the user accepts updates at the gate
- **THEN** the command invokes `npm-update-apply` once with `target: "major"`, which maps `major → ncu --target latest` and always applies `--filter` to the accepted names
- **AND** the command does not invoke `npm-check-updates` directly

#### Scenario: No over-bump beyond the accepted major set

- **WHEN** the accepted set is applied and the project also has minor/patch-only updates available
- **THEN** only the accepted major-level packages are bumped (the `--filter` names list is authoritative); no minor/patch-only dependency is bumped to latest

### Requirement: Hard rules

The command SHALL NOT run tests, lint, or build; SHALL NOT create commits, push, or open PRs; SHALL NOT modify files on `cancel` or when all accepted updates are skipped by override policy; SHALL NOT mutate a `catalog:` consumer `package.json` (only `pnpm-workspace.yaml`); SHALL NOT auto-execute an override without explicit `run-override`; SHALL NOT run `ncu --upgrade` as a fallback after an override fails; SHALL always pass `level=major` and ignore any user-supplied level. The command MAY offer an opt-in isolation gate that delegates branch/worktree creation to `update-isolation` (default `none`); creating an isolation branch/worktree is permitted, committing/pushing/PR-ing is not.

#### Scenario: Optional isolation creates a branch/worktree but never commits

- **WHEN** the user opts into isolation at the gate
- **THEN** the command calls `update-isolation` to create the branch/worktree, applies bumps in the resolved workdir, and performs no commit, push, or PR

#### Scenario: Cancel touches nothing

- **WHEN** the user selects `cancel`
- **THEN** no file is modified and the command exits

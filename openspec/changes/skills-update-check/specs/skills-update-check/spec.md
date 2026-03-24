## ADDED Requirements

### Requirement: Package Runner Detection

The skill SHALL detect the appropriate package runner for the current session using the following priority:

1. Local lockfile in CWD (first match): `bun.lockb`/`bun.lock` → `bunx`, `pnpm-lock.yaml` → `pnpx`, `yarn.lock` → `npx`, `package-lock.json` → `npx`
2. Global binary available: `bun` → `bunx`, `pnpm` → `pnpx`
3. Fallback: `npx`

#### Scenario: Project with bun lockfile

- **WHEN** `bun.lockb` or `bun.lock` exists in the current working directory
- **THEN** the skill SHALL use `bunx` as the runner

#### Scenario: Project with pnpm lockfile

- **WHEN** `pnpm-lock.yaml` exists in the current working directory
- **THEN** the skill SHALL use `pnpx` as the runner

#### Scenario: Project with yarn lockfile

- **WHEN** `yarn.lock` exists in the current working directory
- **THEN** the skill SHALL use `npx` as the runner

#### Scenario: Project with package-lock.json

- **WHEN** `package-lock.json` exists in the current working directory
- **THEN** the skill SHALL use `npx` as the runner

#### Scenario: No lockfile but bun globally available

- **WHEN** no lockfile exists in CWD
- **AND** `bun` is available via `command -v bun`
- **THEN** the skill SHALL use `bunx` as the runner

#### Scenario: No lockfile but pnpm globally available

- **WHEN** no lockfile exists in CWD
- **AND** `pnpm` is available via `command -v pnpm`
- **AND** `bun` is NOT available
- **THEN** the skill SHALL use `pnpx` as the runner

#### Scenario: No lockfile and no preferred runner

- **WHEN** no lockfile exists and neither `bun` nor `pnpm` are globally available
- **THEN** the skill SHALL fall back to `npx`

---

### Requirement: Global Skills Update Check

The skill SHALL run `<runner> skills check -g` to detect available updates for globally-installed skills.sh skills.

#### Scenario: Updates available

- **WHEN** `skills check -g` output lists skills with available updates
- **THEN** the skill SHALL present the update list to the user
- **AND** ask whether to run `<runner> skills update -g`

#### Scenario: All skills up to date

- **WHEN** `skills check -g` output indicates no updates available
- **THEN** the skill SHALL display a brief "Global skills up to date" message

#### Scenario: No global skills installed

- **WHEN** `skills check -g` output contains "No skills tracked"
- **THEN** the skill SHALL inform the user that no global skills.sh skills are installed
- **AND** suggest using `<runner> skills add -g <package>` to install

---

### Requirement: Once Per Session Execution

The skill SHALL execute at most once per session.

#### Scenario: First invocation in session

- **WHEN** the skill is triggered for the first time in a session
- **THEN** it SHALL run the update check

#### Scenario: Subsequent trigger in same session

- **WHEN** the skill has already been executed in the current session
- **THEN** it SHALL NOT re-run the update check

---

### Requirement: Non-Blocking Execution

The skill SHALL run in background without blocking user interaction.

#### Scenario: User starts typing during check

- **WHEN** the skills check is running
- **THEN** the user SHALL be able to continue their conversation without waiting

---

### Requirement: User-Confirmed Updates

The skill SHALL NOT auto-update skills without user confirmation.

#### Scenario: User confirms update

- **WHEN** updates are available and user confirms
- **THEN** the skill SHALL run `<runner> skills update -g`

#### Scenario: User declines update

- **WHEN** updates are available and user declines
- **THEN** the skill SHALL skip the update and continue the session

---

### Requirement: Claude Code Agent Scope

The skill SHALL target Claude Code agent only (v1).

#### Scenario: Skill file location

- **WHEN** examining the skill file
- **THEN** it SHALL be located at `claude-plugins/experiments/skills/skills-update-check/SKILL.md`

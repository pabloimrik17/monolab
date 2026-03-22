## ADDED Requirements

### Requirement: Skill File Location

The `skill-terraformer` skill SHALL exist at `claude-plugins/experiments/skills/skill-terraformer/SKILL.md`.

#### Scenario: Skill file exists

- **WHEN** examining `claude-plugins/experiments/skills/skill-terraformer/`
- **THEN** `SKILL.md` SHALL exist with valid YAML frontmatter containing `name` and `description` fields

#### Scenario: Skill registered in plugin

- **WHEN** listing skills for the experiments plugin
- **THEN** `skill-terraformer` SHALL appear as an available skill

---

### Requirement: Stack Detection

The skill SHALL detect the project's technology stack by examining project files.

Detection signals:
- `package.json` dependencies and devDependencies
- Presence of `nx.json` (Nx monorepo)
- Presence of `app.json` or `app.config.js` (Expo)
- Presence of framework config files (next.config.*, vite.config.*, etc.)

#### Scenario: React project detected

- **WHEN** `package.json` contains `react` in dependencies
- **THEN** the skill SHALL mark React-related skills as applicable

#### Scenario: Expo project detected

- **WHEN** `package.json` contains `expo` in dependencies OR `app.json`/`app.config.js` exists
- **THEN** the skill SHALL mark Expo-related skills as applicable

#### Scenario: Nx monorepo detected

- **WHEN** `nx.json` exists in the project root
- **THEN** the skill SHALL mark Nx-related skills as applicable

#### Scenario: No matching stack

- **WHEN** no detection rules match the project
- **THEN** only universal skills (applicable to all projects) SHALL be marked as applicable

---

### Requirement: Curated Skills Manifest

The skill SHALL contain an embedded curated list mapping technology stacks to skills.sh repositories and skill names.

Each entry SHALL specify:
- Detection condition (what triggers applicability)
- skills.sh repository (`owner/repo`)
- Skill name(s) within that repository
- Whether it's universal (always applicable) or conditional

#### Scenario: Manifest contains entries

- **WHEN** the skill is read
- **THEN** it SHALL contain at least one universal entry and at least one conditional entry

#### Scenario: Entry format is actionable

- **WHEN** processing a manifest entry
- **THEN** each entry SHALL provide enough information to construct a `bunx skills add <repo> --skill <name> --agent claude-code -y` command

---

### Requirement: Installed Skills Detection

The skill SHALL query currently installed skills using `bunx skills list --json` and compare against the curated manifest.

#### Scenario: No skills installed

- **WHEN** `bunx skills list --json` returns an empty array
- **THEN** all applicable skills from the manifest SHALL be marked as pending installation

#### Scenario: Lock file missing

- **WHEN** `skills-lock.json` does not exist but skills are installed
- **THEN** the skill SHOULD warn about missing lock-file persistence

#### Scenario: Some skills already installed

- **WHEN** `bunx skills list --json` returns skills matching some manifest entries
- **THEN** only non-installed applicable skills SHALL be marked as pending

#### Scenario: All applicable skills installed

- **WHEN** all applicable skills from the manifest are already installed
- **THEN** the skill SHALL report that no installation is needed and proceed to postinstall verification

---

### Requirement: Skills Installation

The skill SHALL install pending skills using the skills.sh CLI.

Installation command format: `bunx skills add <repo> --skill <name> --agent claude-code -y`

All installations SHALL be project-level (no `-g` flag).

#### Scenario: Install single pending skill

- **WHEN** one applicable skill is not installed
- **THEN** the skill SHALL execute `bunx skills add <repo> --skill <name> --agent claude-code -y`
- **AND** the skill SHALL report the installation result

#### Scenario: Install multiple pending skills from same repo

- **WHEN** multiple skills from the same repository are pending
- **THEN** the skill MAY batch them: `bunx skills add <repo> --skill <name1> --skill <name2> --agent claude-code -y`

#### Scenario: Installation failure

- **WHEN** a `skills add` command fails
- **THEN** the skill SHALL report the failure and continue with remaining skills

---

### Requirement: Postinstall Script Management

The skill SHALL verify and ensure a `postinstall` script in the root `package.json` when skills are managed (installed now or previously).

The postinstall command SHALL be `bunx skills experimental_install`.

#### Scenario: No postinstall exists

- **WHEN** `package.json` has no `postinstall` script AND skills are managed
- **THEN** the skill SHALL propose adding `"postinstall": "bunx skills experimental_install"`

#### Scenario: Postinstall exists without skills command

- **WHEN** `package.json` has a `postinstall` script that does NOT include `bunx skills experimental_install`
- **THEN** the skill SHALL propose appending `&& bunx skills experimental_install` to the existing script

#### Scenario: Postinstall already includes skills command

- **WHEN** `package.json` `postinstall` already contains `skills experimental_install`
- **THEN** the skill SHALL NOT modify the postinstall script

#### Scenario: No skills managed

- **WHEN** no skills from skills.sh are installed (neither now nor previously)
- **THEN** the skill SHALL NOT propose postinstall changes

---

### Requirement: Skills Lock File Commitment

The skill SHALL advise that `skills-lock.json` be committed to version control after installation.

#### Scenario: Lock file created

- **WHEN** skills are installed and `skills-lock.json` is created/updated
- **THEN** the skill SHALL note that `skills-lock.json` should be committed for `experimental_install` to work on fresh clones

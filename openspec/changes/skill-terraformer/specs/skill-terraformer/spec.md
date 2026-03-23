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
- `package.json` dependencies and devDependencies (`react`, `next`)
- Presence of `components.json` (shadcn/ui)
- Presence of any frontend dependency (triggers universal frontend skills)

#### Scenario: React project detected

- **WHEN** `package.json` contains `react` in dependencies
- **THEN** the skill SHALL mark as applicable: `vercel-react-best-practices`, `vercel-composition-patterns`

#### Scenario: React + shadcn project detected

- **WHEN** `package.json` contains `react` in dependencies AND `components.json` exists
- **THEN** the skill SHALL additionally mark as applicable: `shadcn`

#### Scenario: Next.js project detected

- **WHEN** `package.json` contains `next` in dependencies
- **THEN** the skill SHALL mark as applicable: `next-best-practices`

#### Scenario: Frontend project detected

- **WHEN** the project has any frontend dependency (`react`, `next`, `vue`, `svelte`, etc.)
- **THEN** the skill SHALL mark as applicable: `web-design-guidelines`, `frontend-design`

#### Scenario: No matching stack

- **WHEN** no detection rules match the project
- **THEN** no skills SHALL be marked as applicable

---

### Requirement: Curated Skills Manifest

The skill SHALL contain the following embedded curated list:

| Condición | Repo | Skill |
|-----------|------|-------|
| `react` en deps | `vercel-labs/agent-skills` | `vercel-react-best-practices` |
| `react` en deps | `vercel-labs/agent-skills` | `vercel-composition-patterns` |
| `react` en deps + `components.json` | `shadcn/ui` | `shadcn` |
| `next` en deps | `vercel-labs/next-skills` | `next-best-practices` |
| frontend (universal) | `vercel-labs/agent-skills` | `web-design-guidelines` |
| frontend (universal) | `anthropics/skills` | `frontend-design` |

Each entry SHALL map to a `bunx skills add <repo> --skill <name> --agent claude-code -y` command.

Skills from the same repo MAY be batched in a single `skills add` with multiple `--skill` flags.

#### Scenario: Manifest contains all 6 skills

- **WHEN** the skill is read
- **THEN** it SHALL contain exactly the 6 skills listed above

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

The postinstall command SHALL be `[ -f skills-lock.json ] && bunx skills experimental_install || true` (graceful degradation: only runs if lock file exists, does not block install on failure).

#### Scenario: No postinstall exists

- **WHEN** `package.json` has no `postinstall` script AND skills are managed
- **THEN** the skill SHALL propose adding `"postinstall": "[ -f skills-lock.json ] && bunx skills experimental_install || true"`

#### Scenario: Postinstall exists without skills command

- **WHEN** `package.json` has a `postinstall` script that does NOT include `skills experimental_install`
- **THEN** the skill SHALL propose appending `&& [ -f skills-lock.json ] && bunx skills experimental_install || true` to the existing script

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

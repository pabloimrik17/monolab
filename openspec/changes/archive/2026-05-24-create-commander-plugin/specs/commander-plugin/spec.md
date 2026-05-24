## ADDED Requirements

### Requirement: Commander Plugin Structure

The `commander` plugin SHALL exist at `claude-plugins/commander/` and follow standard Claude Code plugin structure.

The plugin directory SHALL contain:

- `.claude-plugin/plugin.json` manifest
- `commands/` directory containing at minimum `add.md`, `list.md`, `update.md`, `delete.md`
- `skills/` directory containing at minimum `commander-normalize/`
- `package.json` with `"private": true`
- `README.md` documenting the plugin
- `CHANGELOG.md` (initially empty or seeded by release-please)

#### Scenario: Plugin directory exists

- **WHEN** navigating to `claude-plugins/commander/`
- **THEN** the directory SHALL exist with a `.claude-plugin/plugin.json` manifest

#### Scenario: Plugin manifest valid

- **WHEN** examining `claude-plugins/commander/.claude-plugin/plugin.json`
- **THEN** it SHALL include `name: "commander"`, `version`, `description`, and `keywords`

#### Scenario: Commands directory populated

- **WHEN** examining `claude-plugins/commander/commands/`
- **THEN** the directory SHALL contain `add.md`, `list.md`, `update.md`, `delete.md`

#### Scenario: Skills directory populated

- **WHEN** examining `claude-plugins/commander/skills/`
- **THEN** the directory SHALL contain `commander-normalize/SKILL.md`

#### Scenario: package.json is private

- **WHEN** examining `claude-plugins/commander/package.json`
- **THEN** it SHALL contain `"private": true`
- **AND** SHALL have `name: "@m0n0lab/plugin-commander"`

#### Scenario: README exists

- **WHEN** examining the plugin root at `claude-plugins/commander/`
- **THEN** `README.md` SHALL exist
- **AND** SHALL document the four CRUD commands and the `commander-normalize` skill

---

### Requirement: Plugin Manifest Content

The plugin manifest SHALL include:

- `name`: `"commander"`
- `version`: starting at `"0.1.0"` (first release-please bump lands at `1.0.0` via the `feat(commander)!:` change footer)
- `description`: a short single-sentence summary identifying the plugin as the CRUD interface for the user-scoped Commander project registry at `<HOME>/.claude/commander/projects.json`
- `keywords`: a non-empty array including at least `"commander"`, `"registry"`, and `"crud"`
- `author`: matching the repo's plugin convention (`Pablo F.G.` / `pabloimrik17@users.noreply.github.com`)
- `license`: `"MIT"`
- `repository`: pointing at the monolab repo
- `homepage`: pointing at `claude-plugins/commander` on `main`

The plugin manifest SHALL NOT declare a `userConfig` block in this iteration. Future iterations MAY add one if commander grows configurable behavior.

#### Scenario: Manifest has required fields

- **WHEN** parsing `claude-plugins/commander/.claude-plugin/plugin.json`
- **THEN** `name`, `version`, `description`, `keywords`, `author`, `license`, `repository`, `homepage` SHALL be present and non-empty

#### Scenario: Manifest version starts at 0.1.0

- **WHEN** the plugin is first created
- **THEN** `plugin.json#version` SHALL be `"0.1.0"`
- **AND** `package.json#version` SHALL be `"0.1.0"`
- **AND** the matching entry in root `.claude-plugin/marketplace.json` SHALL declare `version: "0.1.0"`

#### Scenario: Keywords cover commander identity

- **WHEN** examining `plugin.json#keywords`
- **THEN** the list SHALL include `"commander"`, `"registry"`, and `"crud"` (case-sensitive, lowercase)

---

### Requirement: Marketplace Registration

The commander plugin SHALL be registered in the root `.claude-plugin/marketplace.json` `plugins[]` array.

The marketplace entry SHALL include:

- `name`: `"commander"`
- `source`: `"./claude-plugins/commander"`
- `version`: matching `claude-plugins/commander/.claude-plugin/plugin.json#version`
- `description`: matching the plugin's `description`

The entry SHALL be placed in `plugins[]` so the jsonpath selector `?(@.name=='commander')` resolves unambiguously to it (the selector is order-independent; placement within the array is not normative — alphabetical-by-name is recommended for human navigability).

#### Scenario: Plugin in marketplace

- **WHEN** examining `.claude-plugin/marketplace.json#plugins`
- **THEN** the array SHALL contain an entry with `name: "commander"`, `source: "./claude-plugins/commander"`, a `version`, and a `description`

#### Scenario: Marketplace version matches manifest

- **WHEN** comparing `claude-plugins/commander/.claude-plugin/plugin.json#version` with the `version` of the commander entry in `.claude-plugin/marketplace.json`
- **THEN** the two SHALL be byte-equal at every release commit

#### Scenario: Plugin installable

- **WHEN** the user runs `/plugin install commander@monolab`
- **THEN** the commander plugin SHALL install successfully

---

### Requirement: Workspace Integration

The plugin SHALL be recognized as a pnpm workspace member without modifying the existing `pnpm-workspace.yaml#packages` glob (`claude-plugins/*` already covers it).

The plugin's `package.json` SHALL declare:

- `name: "@m0n0lab/plugin-commander"`
- `private: true`
- `version: "0.1.0"`
- `description`: a short single-sentence summary (may mirror `plugin.json#description`)

#### Scenario: Workspace recognition

- **WHEN** running `pnpm install` from the repo root
- **THEN** the commander plugin SHALL be recognized as a workspace member
- **AND** SHALL NOT trigger workspace glob changes in `pnpm-workspace.yaml`

#### Scenario: Package.json fields

- **WHEN** examining `claude-plugins/commander/package.json`
- **THEN** it SHALL declare `name: "@m0n0lab/plugin-commander"`, `private: true`, `version: "0.1.0"`, and a non-empty `description`

---

### Requirement: README Content

The plugin's `README.md` SHALL document at minimum:

- The plugin's purpose (CRUD interface over the user-scoped Commander registry at `<HOME>/.claude/commander/projects.json`).
- Each of the four CRUD commands (`/commander:add`, `/commander:list`, `/commander:update`, `/commander:delete`) with a short blurb and at least one example invocation per command.
- The `commander-normalize` skill with a short description.
- A "Releases" section noting that releases are driven by git tags formatted `commander--v{version}` and a pointer to the central `RELEASE.md` at the repo root.

The README SHALL NOT duplicate documentation that already lives in dedicated spec files; brief blurbs with links to the relevant specs are sufficient.

#### Scenario: README enumerates commands

- **WHEN** reading `claude-plugins/commander/README.md`
- **THEN** the file SHALL reference `/commander:add`, `/commander:list`, `/commander:update`, and `/commander:delete`

#### Scenario: README references skill

- **WHEN** reading `claude-plugins/commander/README.md`
- **THEN** the file SHALL reference the `commander-normalize` skill

#### Scenario: README describes release flow

- **WHEN** reading `claude-plugins/commander/README.md`
- **THEN** the file SHALL describe how a release is triggered for the commander plugin (tag prefix `commander--v`) or SHALL link to `RELEASE.md` at the repo root

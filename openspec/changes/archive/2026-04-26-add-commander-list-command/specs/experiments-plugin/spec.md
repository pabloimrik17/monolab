## ADDED Requirements

### Requirement: Commander List Command File

The `experiments` plugin SHALL include `commands/commander-list.md`.

The command file SHALL have YAML frontmatter with a non-empty `description` field. The command SHALL be invocable as `/experiments:commander-list`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `commander-list.md` SHALL exist

#### Scenario: Frontmatter present

- **WHEN** reading `commands/commander-list.md`
- **THEN** the file SHALL have YAML frontmatter with a non-empty `description` field

#### Scenario: Command invocable

- **WHEN** the user types `/experiments:commander-list`
- **THEN** Claude SHALL execute the command instructions

---

### Requirement: Commander List Read-Only Behavior

The `commander-list` command SHALL be strictly read-only. It SHALL NOT create, modify, or delete `projects.json`, its temporary sibling, or any file under `<HOME>/.claude/commander/`.

The command SHALL use the registry read contract documented in `commander-registry`: a missing file is treated as an empty registry, no directory is created, and the file is not touched.

#### Scenario: Missing registry does not create file

- **WHEN** `<HOME>/.claude/commander/projects.json` does not exist
- **AND** the user invokes `/experiments:commander-list`
- **THEN** the command SHALL render the empty-registry message
- **AND** SHALL NOT create the directory `<HOME>/.claude/commander/`
- **AND** SHALL NOT create `projects.json`

#### Scenario: Existing registry remains byte-identical

- **WHEN** the user invokes `/experiments:commander-list` against an existing registry file
- **THEN** the on-disk file SHALL remain byte-identical before and after the command runs

---

### Requirement: Commander List Empty Registry Message

When the registry is empty (file missing OR `projects` object empty), the command SHALL print exactly:

```
No projects registered. Use /experiments:commander-add to register one.
```

The command SHALL exit with code zero.

#### Scenario: Registry file missing

- **WHEN** `<HOME>/.claude/commander/projects.json` does not exist
- **AND** the user invokes `/experiments:commander-list`
- **THEN** the command SHALL print `No projects registered. Use /experiments:commander-add to register one.`
- **AND** SHALL exit with code zero

#### Scenario: Registry file present but `projects` empty

- **WHEN** the registry file exists with `{"version": 2, "projects": {}}`
- **AND** the user invokes `/experiments:commander-list`
- **THEN** the command SHALL print the same empty-registry message
- **AND** SHALL exit with code zero

---

### Requirement: Commander List Render Format

When the registry contains one or more projects, the command SHALL render each project as a YAML-ish block in the registry's insertion order (matching `commander-registry`'s `list()` contract). Blocks SHALL be separated by exactly one blank line. After the last block, the command SHALL print a blank line followed by the line `<N> project(s) registered.` where `<N>` is the count of rendered records.

Each block SHALL begin with the project name on its own line at column 0, followed by per-field lines indented two spaces. Field labels SHALL be left-padded so their colons align at column 17 (i.e. each label string `"  <label>:"` is padded to 17 characters before the value). Fields SHALL be rendered in the order:

1. `path`
2. `monorepoRoot` (only when present and non-empty)
3. `repoType` (only when present and non-empty)
4. `keywords` (joined by `, `)
5. `description`
6. `specialRules` (only when present and non-empty; rendered as a `specialRules:` line followed by indented `- <rule>` lines, one per rule, indented four spaces)
7. `registered` (rendered as `<createdAt-date>` if `updatedAt == createdAt`, else `<createdAt-date>  (updated <updatedAt-date>)`; both dates SHALL be the date portion of the ISO-8601 timestamp, format `YYYY-MM-DD`)

Optional fields that are absent or empty SHALL be omitted entirely (no `null` placeholder line).

The English plural ("project" vs "projects") SHALL be selected based on `<N>`: `1 project registered.` for exactly one record, `<N> projects registered.` otherwise.

#### Scenario: Single complete record

- **WHEN** the registry contains one record with all v2 fields populated, including `specialRules` and `monorepoRoot`
- **THEN** the output SHALL render the project block with all seven fields (`path`, `monorepoRoot`, `repoType`, `keywords`, `description`, `specialRules`, `registered`)
- **AND** the trailing summary SHALL read `1 project registered.`

#### Scenario: Optional fields absent

- **WHEN** a record has no `monorepoRoot` and no `specialRules`
- **THEN** the rendered block SHALL omit those two field lines entirely
- **AND** the remaining fields SHALL render in the same order

#### Scenario: Insertion order preserved

- **WHEN** the registry's `projects` object has keys `["alpha", "beta", "gamma"]` in JSON insertion order
- **THEN** the command SHALL render blocks in the order `alpha`, `beta`, `gamma`
- **AND** SHALL NOT alphabetize, group by `repoType`, or reorder by timestamp

#### Scenario: registered date collapses identical timestamps

- **WHEN** a record has `createdAt == updatedAt`
- **THEN** the `registered:` line SHALL contain only the `createdAt` date in `YYYY-MM-DD` format
- **AND** SHALL NOT include a parenthesized "updated" suffix

#### Scenario: registered date shows update suffix

- **WHEN** a record has `updatedAt` strictly greater than `createdAt`
- **THEN** the `registered:` line SHALL render as `<createdAt-date>  (updated <updatedAt-date>)`

#### Scenario: Plural agreement

- **WHEN** the registry contains exactly one record
- **THEN** the trailing summary SHALL read `1 project registered.`

---

### Requirement: Commander List Drift Surfacing

The command SHALL detect and annotate two drift conditions per record. Annotations SHALL appear as bracketed suffixes on the project-name line, separated from the name by a single space, and from each other by a single space when both apply. The fixed order is: `[legacy: missing repoType]` first, then `[missing path]`.

- **Legacy v1 drift**: triggered when `record.repoType` is absent or empty (string-empty). Suffix: `[legacy: missing repoType]`.
- **Missing path drift**: triggered when `Bash test -d "<record.path>"` exits non-zero (path is not an existing directory at command runtime). Suffix: `[missing path]`. Additionally, the rendered `path:` field line SHALL be annotated with the trailing string ` (NOT FOUND)` after the path value.

Drift surfacing SHALL NOT alter the exit code (the command exits zero even when drift is detected) and SHALL NOT modify the on-disk registry.

#### Scenario: Legacy v1 record without repoType

- **WHEN** a record loaded from the registry lacks `repoType` (or has it as an empty string)
- **THEN** the project-name line SHALL include the suffix `[legacy: missing repoType]`
- **AND** the `repoType:` field line SHALL be omitted from the block
- **AND** the command SHALL exit zero

#### Scenario: Missing path on disk

- **WHEN** a record's `path` resolves to a directory that does not exist at command runtime
- **THEN** the project-name line SHALL include the suffix `[missing path]`
- **AND** the `path:` field line SHALL render as `path:           <path>  (NOT FOUND)` (i.e. the original value with the literal string ` (NOT FOUND)` appended)
- **AND** the command SHALL exit zero

#### Scenario: Both drifts on the same record

- **WHEN** a record both lacks `repoType` AND has a missing `path`
- **THEN** the project-name line SHALL render as `<name> [legacy: missing repoType] [missing path]`
- **AND** the legacy suffix SHALL precede the missing-path suffix

#### Scenario: Drift never alters the registry

- **WHEN** the command renders any combination of drift annotations
- **THEN** the on-disk `projects.json` SHALL remain byte-identical before and after the command runs

---

### Requirement: Commander List Unsupported Registry Version Behavior

When the registry's `version` field is greater than `2`, the command SHALL surface the existing `commander-registry` reader's `"unsupported registry version: <n>"` error and exit non-zero. The command SHALL NOT render any project blocks and SHALL NOT modify the file.

#### Scenario: Future-version registry rejected

- **WHEN** `<HOME>/.claude/commander/projects.json` parses to `{"version": 3, ...}`
- **AND** the user invokes `/experiments:commander-list`
- **THEN** the command SHALL print `unsupported registry version: 3`
- **AND** SHALL exit non-zero
- **AND** SHALL NOT print any project blocks
- **AND** the on-disk file SHALL remain unchanged

---

### Requirement: Commander List No Arguments

The `commander-list` command SHALL accept no arguments. When `ARGUMENTS` is non-empty (after trimming whitespace), the command SHALL print a single line of the form `commander-list takes no arguments; ignoring: <verbatim argument string>` and SHALL continue rendering the registry normally.

The command SHALL exit with the same code it would have produced without the argument (zero on normal render, non-zero on `unsupported registry version`).

#### Scenario: No arguments — normal render

- **WHEN** the user invokes `/experiments:commander-list` with empty `ARGUMENTS`
- **THEN** the command SHALL render the registry without any argument-related notice

#### Scenario: Spurious arguments emit notice and continue

- **WHEN** the user invokes `/experiments:commander-list --foo bar`
- **THEN** the command SHALL print `commander-list takes no arguments; ignoring: --foo bar`
- **AND** SHALL render the registry normally afterward

---

### Requirement: Commander List Plugin Version Bump

When `commander-list.md` is added (or its behavior modified), the experiments plugin version SHALL be bumped consistently across:

- `claude-plugins/experiments/.claude-plugin/plugin.json`
- `claude-plugins/experiments/package.json`
- `.claude-plugin/marketplace.json` (the `experiments` entry)

All three files SHALL carry the same version number after the change.

#### Scenario: Version consistency post-change

- **WHEN** examining `plugin.json`, `package.json`, and `marketplace.json` (for the `experiments` entry) after `commander-list.md` lands
- **THEN** all three SHALL declare the same version number
- **AND** that version SHALL be strictly greater than the version on the previous commit

## ADDED Requirements

### Requirement: Commander Add Command File

The `commander` plugin SHALL include `commands/add.md`.

The command file SHALL have YAML frontmatter with a non-empty `description` field. The command SHALL be invocable as `/commander:add`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/commander/commands/`
- **THEN** `add.md` SHALL exist

#### Scenario: Frontmatter present

- **WHEN** reading `claude-plugins/commander/commands/add.md`
- **THEN** the file SHALL have YAML frontmatter with a non-empty `description` field

#### Scenario: Command invocable

- **WHEN** the user types `/commander:add`
- **THEN** Claude SHALL execute the command instructions

---

### Requirement: Commander Add Metadata Capture Priority

The `commander-add` command SHALL collect project metadata (name, path, keywords, description, special rules) using priority A→B→C:

- **A) Explicit arguments**: fields provided by the user as command arguments are taken as-is.
- **B) Auto-detection**: fields not provided by A are inferred by dispatching a subagent with `model: "haiku"` that inspects the target directory. Detected values SHALL be shown to the user for confirmation or edit before persisting.
- **C) Prompt**: fields still missing after B SHALL be requested from the user field-by-field via `AskUserQuestion`.

#### Scenario: All fields provided as arguments

- **WHEN** the user invokes `/commander:add` with all metadata fields supplied as arguments
- **THEN** the command SHALL NOT dispatch the Haiku subagent
- **AND** SHALL NOT prompt the user for any field except the final save confirmation

#### Scenario: Auto-detection confirmation step

- **WHEN** the command auto-detects any field
- **THEN** it SHALL present the detected values to the user before writing
- **AND** SHALL allow the user to confirm, edit, or reject each field

#### Scenario: Prompted field when undetectable

- **WHEN** a required field cannot be supplied by A or B
- **THEN** the command SHALL prompt the user explicitly for that field

---

### Requirement: Commander Add Monorepo Handling

When the target directory is a monorepo, the `commander-add` command SHALL classify it as single-project or multi-project.

- **Single-project monorepo** (`repoType: "monorepo"`): keywords SHALL be extracted from the entire repository and then normalized via the `commander-normalize` skill before persistence. The description SHALL be the repository-level summary.
- **Multi-project monorepo** (`repoType: "multi-monorepo"`): the command SHALL ask the user which subproject to register. The `path` field SHALL record the chosen subproject directory (not the monorepo root). Keywords AND description SHALL be scoped to the chosen subproject: each subproject's raw keywords are normalized independently by the skill, and the persisted `keywords` are the normalized subproject list (not the top-level union). The top-level union produced by the skill's aggregation step is informational and is NOT persisted on individual subproject records. The persisted `description` SHALL be the subproject-level summary emitted by the auto-detection subagent (or, if absent, the monorepo-level description flagged for user edit at confirmation). The optional `monorepoRoot` field SHALL record the monorepo root path.

#### Scenario: Multi-project monorepo prompts for subproject

- **WHEN** the target directory contains workspace markers (e.g., `pnpm-workspace.yaml`, `nx.json`, `turbo.json`, `lerna.json`) with multiple independent projects
- **AND** the user did not indicate a subproject via arguments
- **THEN** the command SHALL present the detected subprojects via `AskUserQuestion` for the user to choose one

#### Scenario: Keywords scoped to chosen subproject and normalized

- **WHEN** the user picks a subproject in a multi-project monorepo
- **THEN** the persisted `keywords` SHALL be the normalized keyword list for that subproject (produced by the `commander-normalize` skill)
- **AND** the persisted `description` SHALL be the subproject-level summary emitted by the auto-detection subagent (or, if absent, the monorepo-level description flagged for user edit at confirmation)
- **AND** the persisted `path` SHALL be the subproject's absolute directory
- **AND** the persisted `repoType` SHALL be `"multi-monorepo"`

#### Scenario: Single-project monorepo aggregates keywords

- **WHEN** the target directory is a monorepo with a single coherent project
- **THEN** keywords SHALL be aggregated across the repository
- **AND** the aggregated list SHALL be normalized via the `commander-normalize` skill before persistence
- **AND** the persisted `repoType` SHALL be `"monorepo"`

---

### Requirement: Commander Add Keyword Normalization Pipeline

After Haiku auto-detection (Priority B) and before subproject selection (Step 3), the `commander-add` command SHALL invoke the `commander-normalize` skill to transform raw detected keywords into the final persisted `keywords[]`.

The skill invocation SHALL pass the raw `keywords`, `description`, `specialRules`, and the detected topology (`monorepoType`) and SHALL receive back:

- `keywords` (string[]): normalized, deduplicated, alphabetically sorted.
- `droppedTerms` (string[]): raw terms dropped by the vocabulary filter that are not in `excludes`.

Normalization SHALL run:

- Before Step 3 for single-repo and single-project-monorepo flows.
- Per-subproject and then at the top-level for multi-project monorepos (the skill's aggregation step produces the top-level union from already-normalized subproject lists).

#### Scenario: Normalization invoked before subproject selection

- **WHEN** Haiku returns a multi-project monorepo detection
- **THEN** the command SHALL normalize each subproject's keywords via the skill
- **AND** SHALL compute the top-level `keywords` as the union produced by the skill
- **AND** SHALL only then present the subproject list to the user via `AskUserQuestion`

#### Scenario: Persisted keywords come only from normalization

- **WHEN** the command writes a record
- **THEN** the persisted `keywords[]` SHALL be exactly the normalized output from the skill
- **AND** SHALL NOT contain any term absent from the skill's `canonical` vocabulary

#### Scenario: Explicit --keywords argument bypasses normalization

- **WHEN** the user invokes `/commander:add --keywords "foo,bar"`
- **THEN** the command SHALL persist the user-supplied keywords verbatim (lowercased and trimmed)
- **AND** SHALL NOT filter them against the vocabulary
- **AND** SHALL NOT emit a vocabulary suggestion for unrecognized terms in that list

---

### Requirement: Commander Add repoType Persistence

The `commander-add` command SHALL derive and persist a `repoType` field on every record it writes, using the following mapping from Haiku's `monorepoType`:

- `monorepoType: "none"` → `repoType: "single-repo"`
- `monorepoType: "single"` → `repoType: "monorepo"`
- `monorepoType: "multi"` → `repoType: "multi-monorepo"`

When Priority A supplies all fields and Priority B (Haiku) is skipped, the command SHALL still determine `repoType` — either by inference from filesystem markers at the supplied `path` or by prompting the user via `AskUserQuestion` with the three enumeration values as options.

The derived `repoType` SHALL be shown to the user in the Step 6 confirmation and SHALL be editable.

#### Scenario: Derivation from Haiku detection

- **WHEN** Haiku returns `monorepoType: "multi"` for the target directory
- **THEN** the persisted record SHALL contain `repoType: "multi-monorepo"`

#### Scenario: Derivation when Haiku is skipped

- **WHEN** all required fields are supplied via arguments and Haiku is not dispatched
- **THEN** the command SHALL determine `repoType` without invoking Haiku
- **AND** SHALL include `repoType` in the final confirmed record

#### Scenario: repoType visible and editable at confirmation

- **WHEN** the Step 6 confirmation is presented
- **THEN** the displayed record SHALL include `repoType`
- **AND** the user SHALL be able to edit `repoType` via the "Edit" option before saving

---

### Requirement: Commander Add Vocabulary Suggestion Flow

After a successful write, if the normalization pipeline reported any `droppedTerms` (non-excluded terms dropped by the vocabulary filter), the `commander-add` command SHALL offer the user a single `AskUserQuestion` to open a GitHub issue suggesting those terms be added to the skill's vocabulary.

Options SHALL include:

- **Yes**: invoke `gh issue create` with a title of the form `vocab: add <term>[, <term>...]` and a body listing the dropped terms, the project name that triggered them, and the current UTC date.
- **No**: dismiss for this project.
- **Skip session**: suppress further vocabulary suggestions for the remainder of the current Claude Code session.

The flow SHALL NOT block the write. If the write has already succeeded and the user declines or dismisses, the registered record SHALL remain on disk.

If the `gh` CLI is unavailable on `PATH`, the command SHALL silently skip the suggestion flow (no error, no prompt).

#### Scenario: No dropped terms, no prompt

- **WHEN** normalization reports an empty `droppedTerms` list
- **THEN** the command SHALL NOT invoke `AskUserQuestion` for vocabulary suggestions

#### Scenario: Dropped terms trigger the prompt

- **WHEN** normalization reports `droppedTerms: ["weirdlib","customtool"]`
- **AND** the write has completed successfully
- **THEN** the command SHALL present the suggestion prompt once
- **AND** on "Yes" SHALL run `gh issue create --title "vocab: add weirdlib, customtool" --body <body>`

#### Scenario: gh CLI missing

- **WHEN** the suggestion flow is reached but `gh` is not on `PATH`
- **THEN** the command SHALL skip the prompt silently
- **AND** SHALL NOT raise an error

#### Scenario: Session-level skip honored

- **WHEN** the user selects "Skip session" on one registration
- **AND** another `commander-add` invocation occurs in the same session with dropped terms
- **THEN** the command SHALL NOT present the vocabulary suggestion prompt

---

### Requirement: Commander Add Registration Flow

The `commander-add` command SHALL, before persisting:

1. Validate that `path` exists on disk.
2. Validate that `name` is not already present in the registry.
3. Show the final record to the user and require an explicit confirmation.

On confirmation the command SHALL invoke the `commander-registry` `add` operation.

#### Scenario: User cancels at final confirmation

- **WHEN** the user declines the final confirmation
- **THEN** the registry file SHALL remain unchanged
- **AND** the command SHALL exit without error

#### Scenario: Duplicate name blocked before prompt

- **WHEN** the proposed `name` already exists in the registry
- **THEN** the command SHALL inform the user and SHALL NOT proceed to write
- **AND** SHALL offer the user the option to pick a different name or abort

#### Scenario: Path does not exist

- **WHEN** the resolved `path` does not exist on disk
- **THEN** the command SHALL abort with a clear message identifying the invalid path

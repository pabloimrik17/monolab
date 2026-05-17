## ADDED Requirements

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

- **WHEN** the user invokes `/experiments:commander-add --keywords "foo,bar"`
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

## MODIFIED Requirements

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

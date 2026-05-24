## MODIFIED Requirements

### Requirement: Commander Normalize Skill File

The `commander` plugin SHALL provide a `commander-normalize` skill at `claude-plugins/commander/skills/commander-normalize/SKILL.md`.

The skill file SHALL have YAML frontmatter including `name: commander-normalize` and a `description` field that mentions controlled-vocabulary keyword normalization for the Commander registry.

#### Scenario: Skill file exists and is discoverable

- **WHEN** the `commander` plugin is installed
- **THEN** `claude-plugins/commander/skills/commander-normalize/SKILL.md` SHALL exist with valid YAML frontmatter
- **AND** the skill SHALL appear in the available skills list as `commander:commander-normalize`

#### Scenario: Skill description mentions normalization

- **WHEN** reading the skill frontmatter
- **THEN** the `description` SHALL mention Commander, keywords, vocabulary, and normalization

---

### Requirement: Vocabulary Sidecar

The skill SHALL ship a `references/vocabulary.json` file at `claude-plugins/commander/skills/commander-normalize/references/vocabulary.json` containing three top-level keys:

- `canonical` (string[]): the closed set of terms permitted in persisted `keywords[]`.
- `synonyms` (object): map of non-canonical input terms to the list of canonical terms they expand into.
- `excludes` (string[]): terms that SHALL never appear in persisted `keywords[]` even when Haiku emits them.

All entries SHALL be lowercase, kebab-case, and free of whitespace.

#### Scenario: Vocabulary file exists

- **WHEN** the skill is loaded
- **THEN** `references/vocabulary.json` SHALL exist and parse as valid JSON
- **AND** SHALL contain `canonical`, `synonyms`, and `excludes` keys

#### Scenario: Canonical terms are unique and lowercase

- **WHEN** `vocabulary.json#canonical` is validated
- **THEN** every entry SHALL be lowercase with no duplicates
- **AND** no entry SHALL appear in `excludes`

#### Scenario: Synonyms expand to canonical

- **WHEN** `vocabulary.json#synonyms` is validated
- **THEN** every value (flattened) SHALL appear in `canonical`
- **AND** no synonym key SHALL appear in `canonical`

---

### Requirement: Dropped-Term Reporting

The skill SHALL return, alongside the normalized keyword list, a list of raw terms that were dropped by the vocabulary filter (step 2) and are NOT in `excludes`.

This list enables the caller to surface vocabulary gaps to the user (see the `commander-add-command` capability's vocabulary suggestion flow).

Terms dropped because they are in `excludes` SHALL NOT appear in this list (they are intentional drops, not gaps).

For `repoType == "multi-monorepo"`, `droppedTerms` SHALL be the deduplicated union of step-2 drops across the top-level input AND every subproject input, computed within the single skill invocation. Callers SHALL NOT merge `droppedTerms` across multiple invocations.

#### Scenario: Gap is reported

- **WHEN** raw input contains `"weirdlib"` that is neither in `canonical` nor `excludes`
- **THEN** the skill SHALL include `"weirdlib"` in the dropped-term report

#### Scenario: Excluded term is not a gap

- **WHEN** raw input contains `"eslint"` that is in `excludes`
- **THEN** the skill SHALL NOT include `"eslint"` in the dropped-term report

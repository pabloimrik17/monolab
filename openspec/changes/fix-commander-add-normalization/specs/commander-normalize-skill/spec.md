## ADDED Requirements

### Requirement: Commander Normalize Skill File

The `experiments` plugin SHALL provide a `commander-normalize` skill at `claude-plugins/experiments/skills/commander-normalize/SKILL.md`.

The skill file SHALL have YAML frontmatter including `name: commander-normalize` and a `description` field that mentions controlled-vocabulary keyword normalization for the Commander registry.

#### Scenario: Skill file exists and is discoverable

- **WHEN** the `experiments` plugin is installed
- **THEN** `claude-plugins/experiments/skills/commander-normalize/SKILL.md` SHALL exist with valid YAML frontmatter
- **AND** the skill SHALL appear in the available skills list as `experiments:commander-normalize`

#### Scenario: Skill description mentions normalization

- **WHEN** reading the skill frontmatter
- **THEN** the `description` SHALL mention Commander, keywords, vocabulary, and normalization

---

### Requirement: Vocabulary Sidecar

The skill SHALL ship a `references/vocabulary.json` file at `claude-plugins/experiments/skills/commander-normalize/references/vocabulary.json` containing three top-level keys:

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

### Requirement: Normalization Pipeline

The skill SHALL define a six-step pipeline applied to a set of raw keyword inputs (from Haiku detection) plus optional `description` and `specialRules` fields. Steps SHALL execute in the order below.

1. **Synonym expansion**: each raw term present as a key in `synonyms` SHALL be replaced by the corresponding canonical terms. Non-synonym terms pass through unchanged.
2. **Vocabulary filter**: the working set SHALL be intersected with `canonical`. Terms absent from `canonical` are dropped.
3. **Exclusion**: any term in `excludes` SHALL be removed from the working set.
4. **Multi-monorepo aggregation**: applied only when the caller indicates `repoType == "multi-monorepo"`. Top-level `keywords` SHALL be the set-union of each subproject's already-normalized `keywords`.
5. **Promotion**: for each canonical term present in `description` (case-insensitive, matched on word boundaries) or in any `specialRules` entry, the term SHALL be added to the working set.
6. **Dedup + sort**: the working set SHALL be deduplicated and sorted alphabetically ascending.

The pipeline SHALL return a string array of lowercase, canonical, deduplicated, alphabetically-sorted keywords.

#### Scenario: Synonym expansion precedes filtering

- **WHEN** the raw input contains `"pnpm-workspace"` and `synonyms` maps it to `["pnpm","monorepo"]`
- **THEN** after step 1 the working set SHALL contain `"pnpm"` and `"monorepo"` instead of `"pnpm-workspace"`

#### Scenario: Non-vocabulary terms dropped

- **WHEN** the raw input contains `"foobar"` that is neither in `canonical` nor in `synonyms`
- **THEN** `foobar` SHALL NOT appear in the output

#### Scenario: Excluded terms removed even if canonical

- **WHEN** a term such as `"eslint"` appears in both `canonical` (hypothetically) and `excludes`
- **THEN** the pipeline SHALL remove it before returning
- **AND** the output SHALL NOT contain `"eslint"`

#### Scenario: Multi-monorepo aggregation is a union

- **WHEN** `repoType == "multi-monorepo"` and two subprojects have normalized keywords `["react","typescript"]` and `["vue","typescript"]`
- **THEN** the top-level `keywords` SHALL equal `["react","typescript","vue"]`

#### Scenario: Promotion recovers prose-only terms

- **WHEN** Haiku emits `keywords: []` but `description` contains "Inversify-based clean architecture" and `"inversify"` + `"clean-architecture"` are in `canonical`
- **THEN** the pipeline output SHALL include `"inversify"` and `"clean-architecture"`

#### Scenario: Output is deterministically ordered

- **WHEN** the same raw inputs are normalized twice
- **THEN** both outputs SHALL be byte-identical
- **AND** the output SHALL be sorted alphabetically ascending with no duplicates

---

### Requirement: Dropped-Term Reporting

The skill SHALL return, alongside the normalized keyword list, a list of raw terms that were dropped by the vocabulary filter (step 2) and are NOT in `excludes`.

This list enables the caller to surface vocabulary gaps to the user (see the experiments-plugin `commander-add` vocabulary suggestion flow).

Terms dropped because they are in `excludes` SHALL NOT appear in this list (they are intentional drops, not gaps).

#### Scenario: Gap is reported

- **WHEN** raw input contains `"weirdlib"` that is neither in `canonical` nor `excludes`
- **THEN** the skill SHALL include `"weirdlib"` in the dropped-term report

#### Scenario: Excluded term is not a gap

- **WHEN** raw input contains `"eslint"` that is in `excludes`
- **THEN** the skill SHALL NOT include `"eslint"` in the dropped-term report

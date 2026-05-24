# commander-update Command Specification

## Purpose

Defines the `/commander:update` slash command — a targeted, single-record editor for the user-scoped Commander registry. The command resolves a target project (explicit name or interactive picker), gathers proposed field values through a flag → Haiku re-scan → `AskUserQuestion` priority chain, renders a diff, and persists via the registry's `update(name, patch)` write primitive. The command is the only user-facing remediation path for `repoType` drift on legacy v1 records.

## Requirements

### Requirement: Commander Update Command File

The `commander` plugin SHALL include `commands/update.md`.

The command file SHALL have YAML frontmatter with a non-empty `description` field. The command SHALL be invocable as `/commander:update`.

#### Scenario: Command file exists

- **WHEN** examining `claude-plugins/commander/commands/`
- **THEN** `update.md` SHALL exist

#### Scenario: Frontmatter present

- **WHEN** reading `claude-plugins/commander/commands/update.md`
- **THEN** the file SHALL have YAML frontmatter with a non-empty `description` field

#### Scenario: Command invocable

- **WHEN** the user types `/commander:update`
- **THEN** Claude SHALL execute the command instructions

---

### Requirement: Invocation Surface

The `commander` plugin SHALL expose a `/commander:update` slash command that edits a single registered project record in place.

Invocation form:

```text
/commander:update [<name> | --name <name>] [--keywords <csv>] [--description <text>] [--rules <csv>] [--repo-type <enum>] [--refresh]
```

All flags are optional. Both positional `<name>` and `--name <name>` are accepted and equivalent for target identification. If both are supplied and their values differ, the command SHALL abort with `"conflicting target name inputs"` and SHALL NOT modify the registry.

#### Scenario: Command discovered by Claude Code

- **WHEN** the `commander` plugin is installed
- **THEN** `/commander:update` SHALL appear in the slash-command list
- **AND** SHALL be invocable with the documented argument forms

#### Scenario: Unknown flag rejected

- **WHEN** `ARGUMENTS` contains a flag not in `{ --name, --keywords, --description, --rules, --repo-type, --refresh }`
- **THEN** the command SHALL abort with `"unknown flag: <name>"`
- **AND** SHALL NOT modify the registry

#### Scenario: Positional name and --name disagree

- **WHEN** `ARGUMENTS` contains both a positional `<name>` token and `--name <value>`
- **AND** the two values are not byte-equal
- **THEN** the command SHALL abort with `"conflicting target name inputs"`
- **AND** SHALL NOT prompt the user further
- **AND** SHALL NOT modify the registry

---

### Requirement: Target Resolution Priority A → B

The command SHALL resolve which project record to edit using a two-step priority:

- **A) Explicit name** — first positional argument or `--name <value>`. When supplied, the command SHALL skip Priority B.
- **B) Interactive picker** — when no name is supplied, the command SHALL invoke `list()` and present projects via a single `AskUserQuestion`, one option per project plus a final `"Cancel"`.

Option labels in the picker SHALL be `<name> — <path>`, mirroring `commander-delete`. The empty-registry path is the only exit before picker render.

#### Scenario: Explicit name resolves directly

- **WHEN** the user invokes `/commander:update investlab`
- **AND** `investlab` is a key in `projects`
- **THEN** the target SHALL be set to `investlab`
- **AND** the interactive picker SHALL NOT be shown

#### Scenario: Explicit name not registered aborts

- **WHEN** the user invokes `/commander:update <name>` and `<name>` is not in the registry
- **THEN** the command SHALL abort with `"project '<name>' is not registered"`
- **AND** SHALL NOT enter the picker as a fallback
- **AND** SHALL NOT modify the registry

#### Scenario: No name supplied opens picker

- **WHEN** the user invokes `/commander:update` with no positional argument and no `--name`
- **AND** the registry contains at least one project
- **THEN** the command SHALL present every registered project plus `"Cancel"` via `AskUserQuestion`
- **AND** the user's selection SHALL become the target

#### Scenario: Empty registry exits cleanly

- **WHEN** the registry file is missing or `projects` is `{}`
- **THEN** the command SHALL print `No projects registered. Use /commander:add to register one.` and exit
- **AND** SHALL NOT prompt the user
- **AND** SHALL NOT create or modify any file

#### Scenario: Picker cancel exits without write

- **WHEN** the user selects `"Cancel"` in the picker (or aborts the prompt)
- **THEN** the command SHALL exit with `"update cancelled"`
- **AND** SHALL NOT modify the registry

---

### Requirement: Editable Field Set

The command SHALL allow the user to update one or more of the following fields:

- `keywords` (string[])
- `description` (string)
- `specialRules` (string[])
- `repoType` (enum: `single-repo` | `monorepo` | `multi-monorepo`)

The command SHALL NOT support editing `name`, `path`, `monorepoRoot`, `createdAt`, or `updatedAt`. `updatedAt` is refreshed automatically; the others are intentionally out of scope.

#### Scenario: Path edit not offered

- **WHEN** the command renders editable-field choices to the user (initial Edit menu or post-diff Edit menu)
- **THEN** `path`, `monorepoRoot`, `name`, `createdAt`, `updatedAt` SHALL NOT appear as options

#### Scenario: repoType edit enumeration

- **WHEN** the user picks `repoType` for edit
- **THEN** the command SHALL present `single-repo`, `monorepo`, `multi-monorepo` as the only options
- **AND** the current value (or `(none — legacy v1 record)` if absent) SHALL be quoted in the question copy

---

### Requirement: Per-Field Source Priority A → B → C

For each editable field, the command SHALL resolve its proposed value with the following priority:

- **A) Explicit flag value** — `--keywords <csv>`, `--description <text>`, `--rules <csv>`, `--repo-type <enum>`. Used verbatim (lowercased and trimmed for csv inputs).
- **B) Haiku re-scan** — opt-in only. Triggered by `--refresh` or by the user selecting `"Re-scan via Haiku"` in the Edit menu. Re-runs the same subagent prompt as `commander-add` Step 2 against the record's current `path`, then re-normalizes via `commander-normalize`.
- **C) `AskUserQuestion` per field** — pre-fills the question copy with the current value so the user sees what is being replaced.

When Priority A supplies a field, Priorities B and C SHALL NOT be invoked for that field.

#### Scenario: Explicit --description flag bypasses prompts

- **WHEN** the user passes `--description "..."` 
- **THEN** the new `description` SHALL be set to the flag value verbatim
- **AND** `AskUserQuestion` SHALL NOT be raised for `description`
- **AND** Haiku SHALL NOT be invoked for `description`

#### Scenario: --refresh re-runs Haiku once

- **WHEN** the user passes `--refresh`
- **THEN** the command SHALL invoke the Haiku subagent once against the record's current `path` before showing the diff
- **AND** detected `keywords`, `description`, `specialRules` SHALL replace their current values (for fields not already supplied by Priority A)
- **AND** `repoType` SHALL NOT be auto-changed by re-scan (rationale: re-classification of repoType against an unchanged path is rarely the user's intent; require explicit edit)

#### Scenario: No --refresh ⇒ no Haiku

- **WHEN** the user invokes the command without `--refresh` and no explicit flags for `keywords`/`description`/`specialRules`
- **THEN** Haiku SHALL NOT be dispatched
- **AND** the initial diff SHALL render the existing record (no changes) and the Edit menu shall present field-pick options

---

### Requirement: Keyword Normalization Bypass on Explicit Flag

When the user supplies `--keywords <csv>`, the supplied list SHALL be persisted verbatim (lowercased, trimmed, deduplicated) and the `commander-normalize` skill SHALL NOT be invoked for this update.

The vocabulary suggestion flow (reused from `commander-add` Step 7) SHALL also be suppressed for the invocation when `--keywords` is supplied.

This rule is identical to `commander-add`'s "Explicit `--keywords` bypasses normalization" rule.

#### Scenario: --keywords supplied bypasses normalize

- **WHEN** the user invokes the command with `--keywords "react,foo-internal"`
- **THEN** the persisted `keywords` SHALL be exactly `["react", "foo-internal"]`
- **AND** `commander-normalize` SHALL NOT be invoked
- **AND** the post-write vocab-suggestion prompt SHALL NOT be shown for this invocation

#### Scenario: Keywords from Haiku or AskUserQuestion go through normalize

- **WHEN** the resolved `keywords` value comes from Priority B (Haiku re-scan) or Priority C (`AskUserQuestion`)
- **THEN** the command SHALL invoke `commander-normalize` with the resolved `keywords`, the resolved `repoType`, and a `subprojects` argument shape consistent with the record's `repoType`
- **AND** the normalized result SHALL replace the raw resolved value in the proposed record

---

### Requirement: Diff Render Before Confirmation

After all editable fields are resolved (A→B→C), the command SHALL compute a diff between the current record and the proposed record and present it to the user.

The diff SHALL:

1. Include only fields whose normalized proposed value differs from the current value.
2. Render `keywords` and `specialRules` as sorted lists per side with `+`/`–` markers on added/removed entries.
3. Render `description` as the literal old and new strings.
4. Render `repoType` as `<current> → <proposed>`, with `(none — legacy v1 record)` substituted for an absent current value, annotated with `← drift backfill`.
5. Refresh `updatedAt` in the proposed record at diff time, but NOT count `updatedAt` as a diff row.

If the diff is empty (every resolved field matches its current value), the command SHALL print `"no changes"` and exit without writing.

#### Scenario: Only changed fields appear in diff

- **WHEN** the user edits only `description`
- **THEN** the diff SHALL show one row for `description`
- **AND** SHALL NOT show rows for `keywords`, `specialRules`, `repoType`

#### Scenario: Legacy v1 backfill annotated

- **WHEN** the target record has no `repoType` (legacy v1)
- **AND** the user (or `--repo-type` flag) sets `repoType` to `single-repo`
- **THEN** the diff row SHALL render `"(none — legacy v1 record)" → "single-repo"`
- **AND** SHALL include the `← drift backfill` annotation

#### Scenario: Empty diff short-circuits

- **WHEN** every resolved editable field matches its current value
- **THEN** the command SHALL print `"no changes"` and exit
- **AND** SHALL NOT write to the registry
- **AND** SHALL NOT bump `updatedAt`

---

### Requirement: Confirmation Gate Save / Edit / Abort

After rendering the diff, the command SHALL prompt via a single `AskUserQuestion` with exactly three options:

- `"Save"` — proceed to atomic write.
- `"Edit"` — re-enter the edit flow for a single field of the user's choice from the editable set; after the edit, recompute the diff and re-prompt. Loops until Save or Abort.
- `"Abort"` — exit without writing.

The prompt copy SHALL frame `"Abort"` as the safe default; the tool does not enforce defaults.

#### Scenario: Save triggers write

- **WHEN** the user selects `"Save"` at the confirmation prompt
- **THEN** the command SHALL invoke `update(name, patch)` on the registry with the resolved patch
- **AND** SHALL surface a concise success message quoting `name` and the changed fields

#### Scenario: Edit loops back to diff

- **WHEN** the user selects `"Edit"` and picks a field
- **THEN** the command SHALL re-prompt that field via Priority C (`AskUserQuestion`)
- **AND** SHALL recompute the diff
- **AND** SHALL re-present the confirmation prompt with the updated diff

#### Scenario: Abort exits cleanly

- **WHEN** the user selects `"Abort"` (or aborts the prompt)
- **THEN** the command SHALL exit with `"update cancelled"`
- **AND** the on-disk registry SHALL remain byte-equivalent

---

### Requirement: Atomic Write Reuses Registry Recipe

On `"Save"`, the command SHALL persist the updated record via the `update(name, patch)` registry primitive, which uses the same atomic recipe as `add` / `delete` (serialize → write `projects.json.tmp` → `mv` over `projects.json`).

If any persistence step fails, the previous `projects.json` SHALL remain unchanged. The command SHALL remove any leftover `projects.json.tmp` on abort or failure between the temp-write and the rename.

#### Scenario: Successful write refreshes updatedAt

- **WHEN** `"Save"` is selected and the write completes
- **THEN** the persisted record SHALL have `updatedAt` set to the current UTC ISO-8601 timestamp
- **AND** `createdAt` SHALL be byte-equivalent to its previous value
- **AND** all other records SHALL be byte-equivalent in their fields
- **AND** the registry `version` SHALL remain unchanged

#### Scenario: Crash between temp write and rename

- **WHEN** the process is interrupted after the temp file is written but before the rename
- **THEN** `projects.json` SHALL remain in its previous state (unchanged record, unchanged `updatedAt`)
- **AND** the temp file MAY remain on disk; subsequent writes SHALL overwrite it

---

### Requirement: Vocabulary Suggestion Reuse

After a successful write that altered `keywords` (and only when the user did NOT supply `--keywords`), the command SHALL surface the same vocabulary-suggestion prompt as `commander-add` Step 7, with the same skip conditions (`droppedTerms` empty, session-skip flag set, `gh` not on PATH).

The session-skip flag is shared with `commander-add`: setting it during an `add` invocation also suppresses it for subsequent `update` invocations within the same Claude Code session, and vice versa.

#### Scenario: droppedTerms triggers suggestion

- **WHEN** the keyword edit went through `commander-normalize`
- **AND** the skill returned a non-empty `droppedTerms` list
- **AND** `gh` is on `PATH`
- **AND** the session-skip flag is not set
- **THEN** the command SHALL show the three-option `AskUserQuestion` (Yes / No / Skip session) defined in `commander-add` Step 7
- **AND** the registry write SHALL NOT be rolled back regardless of the user's answer or `gh` exit code

#### Scenario: --keywords suppresses suggestion

- **WHEN** the user supplied `--keywords` on this invocation
- **THEN** the vocabulary-suggestion prompt SHALL NOT be shown
- **AND** `droppedTerms` SHALL NOT be computed (normalize was bypassed)

---

### Requirement: Error Messages

The command SHALL surface the following user-facing error messages, all without modifying the registry:

- `"no projects registered"` — registry file is missing or `projects` is `{}` (target resolution Step A→B or Step 4 defensive race).
- `"project '<name>' is not registered"` — explicit name (Step A) or defensive race (Step 4) targeted a key not present in `projects`.
- `"unknown flag: <flag>"` — Step 1 saw an unsupported flag in `ARGUMENTS`.
- `"conflicting target name inputs"` — Step 1 saw both a positional `<name>` and `--name <value>` with non-equal values.
- `"invalid repoType: <value>"` — `--repo-type` supplied a value outside the enum.
- `"field '<name>' is not editable"` — a patch built by the command tried to set a non-editable field (defensive — should be unreachable through normal flow).
- `"unsupported registry version: <n>"` — read path hit a `version` greater than the highest known version. Reused from `commander-add`.
- `"registry file is not valid JSON"` — `Read` succeeded but parsing failed. Reused from `commander-add`.

`"update cancelled"` and `"no changes"` are neutral exit messages (not errors).

#### Scenario: Invalid --repo-type rejected

- **WHEN** the user invokes the command with `--repo-type foo`
- **THEN** the command SHALL abort with `"invalid repoType: foo"`
- **AND** SHALL NOT prompt the user further
- **AND** SHALL NOT modify the registry

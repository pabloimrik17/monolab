## Purpose

Turns an applied deep-update run into durable knowledge — an immutable run note plus accumulative per-package hubs — between the apply step and the cleanup prompt, so the research the run paid for outlives the run directory instead of being deleted with it.

## ADDED Requirements

### Requirement: Skill location and structure

The skill SHALL exist at `claude-plugins/experiments/skills/persist-run-knowledge/SKILL.md` with YAML frontmatter containing `name: persist-run-knowledge` and a `description` that triggers on the moment a deep run has finished applying and has not yet reached its cleanup prompt.

The note and hub contracts — frontmatter keys, slot markers, section markers and per-slot line caps — SHALL live in `claude-plugins/experiments/skills/persist-run-knowledge/reference/note-templates.md`. `SKILL.md` SHALL stay a procedure and SHALL NOT carry its own copy of those templates.

#### Scenario: Skill files exist

- **WHEN** examining the experiments plugin structure
- **THEN** `skills/persist-run-knowledge/SKILL.md` SHALL exist with frontmatter `name: persist-run-knowledge`
- **AND** `skills/persist-run-knowledge/reference/note-templates.md` SHALL exist

#### Scenario: Description targets the trigger moment

- **WHEN** reading the skill `description`
- **THEN** it SHALL name the moment after a deep run's apply step completes and before its cleanup prompt

#### Scenario: Templates referenced, not restated

- **WHEN** examining `SKILL.md`
- **THEN** it SHALL point to `reference/note-templates.md` for the note and hub shapes
- **AND** SHALL NOT restate the frontmatter keys or slot markers inline

---

### Requirement: Trigger point and inputs

Both deep orchestrators SHALL invoke the skill after the apply step completes and before the `delete-plan` / `keep-plan` prompt is presented to the user.

The skill SHALL accept `{ runDir, outcome, synthetic? }` — the run directory, the outcome object assembled by the orchestrator in the `outcome.json` shape of the store contract (every field except `recordedAt`: `runId`, `level`, `mode`, `gateOption` — one of `apply-all`, `apply-bumps-only`, `pick-subset`, `unknown` — and one `projects[]` entry per project with `mechanism`, the verbatim `bumps` fragment and the `changeset` record), and an optional flag marking the run synthetic. The skill SHALL stamp `recordedAt` and write `<runDir>/outcome.json` from that object before anything is copied; the orchestrator SHALL NOT write the file itself.

The skill SHALL NOT be invoked on the `cancel` path, on any `abort` path, or when the run-level `outcome` is `failed`.

#### Scenario: Invoked between apply and cleanup

- **WHEN** a deep run finishes its apply step and its summary is computed
- **THEN** the skill SHALL be invoked before the `delete-plan` / `keep-plan` prompt is presented

#### Scenario: outcome.json written from the inputs

- **WHEN** the skill receives `{ runDir, outcome }`
- **THEN** it SHALL write `<runDir>/outcome.json` carrying the object's `runId`, `level`, `mode`, `gateOption` and `projects[]` plus a stamped `recordedAt`
- **AND** SHALL do so before the copy step runs

#### Scenario: Cancel and abort never reach persist

- **WHEN** the run ends on the `cancel` path or on any `abort` path
- **THEN** the skill SHALL NOT be invoked
- **AND** no file under the knowledge root and no `outcome.json` SHALL be written

---

### Requirement: Persist criteria and write boundary

A run whose run-level `outcome` is `applied` or `partial` SHALL be persisted. A run whose run-level `outcome` is `failed` SHALL persist nothing — neither a run note, nor a hub section, nor a raw copy.

A run that applied its bumps and found no applicable improvements — `Applicable (0)` — is an `applied` run and SHALL be persisted with both a run note and its package hub sections, because "nothing to apply at this range" is itself a reusable conclusion.

The skill SHALL write only under the resolved knowledge root and to `<runDir>/outcome.json`. It SHALL NOT write to project files, to the Commander registry, to the changelog cache, or to any other path.

#### Scenario: Partial run persisted

- **WHEN** one project's bumps failed and another's succeeded
- **THEN** the run-level `outcome` SHALL be `partial`
- **AND** the run SHALL be persisted

#### Scenario: Failed run persists nothing

- **WHEN** every project's bumps failed and the run-level `outcome` is `failed`
- **THEN** no run note, hub section or raw copy SHALL be written

#### Scenario: Applicable (0) is persisted

- **WHEN** an applied run's changeset gate reports `Applicable (0)` for every project
- **THEN** a run note and the package hub sections SHALL still be written

#### Scenario: Writes stay inside the boundary

- **WHEN** the skill completes on any run
- **THEN** every file it created or modified SHALL be under the knowledge root or be `<runDir>/outcome.json`

---

### Requirement: Persist pipeline order

The skill SHALL execute these five steps in this order, and SHALL NOT reorder, merge or skip any of them.

1. `copy-run-knowledge.mjs` — stamps `recordedAt` on the `outcome` input and writes it as `<runDir>/outcome.json`, bootstraps the knowledge root on first use, copies the allowlisted run artefacts, writes the run note and every package hub section with their slots left empty, and prints a JSON digest naming the run id, the note path, the hub paths, the slot count and the distill count.
2. Exactly **one** subagent, given only the paths from that digest. Its whole job SHALL be to fill every `<!-- slot -->` in those files from the raw copy. It SHALL respect each slot's line cap, SHALL NOT write code blocks, and SHALL NOT change any line outside a slot. Its final line SHALL be `<runId>: filled <n>/<n> slots`.
3. `check-knowledge-note.mjs` over the written paths — frontmatter keys and types, every slot filled, caps respected, nothing edited outside the slots, no occurrence of the word "plan" in headings. Violations SHALL be relayed to the same subagent for at most **two** repair rounds; residual violations after the second round SHALL leave the note at `status: draft`, which recall skips, and SHALL be reflected in the digest.
4. `build-knowledge-index.mjs` — rebuilds `index.json` from the notes on disk and refreshes `supersededBy`.
5. Return exactly one line to the caller: `Knowledge: persisted <runId> → <root> (<p> packages, <h> hubs, <d> distilled, status <ok|draft>)`.

#### Scenario: Scripts copy, one subagent writes, a script validates

- **WHEN** the skill persists a run
- **THEN** the copy, validation and index steps SHALL be performed by `copy-run-knowledge.mjs`, `check-knowledge-note.mjs` and `build-knowledge-index.mjs`
- **AND** exactly one subagent SHALL be spawned, writing only inside `<!-- slot -->` pairs

#### Scenario: Repair loop is capped at two rounds

- **WHEN** the validator still reports violations after two repair rounds
- **THEN** the note SHALL be left at `status: draft`
- **AND** the skill SHALL stop repairing and continue to the index rebuild

#### Scenario: Draft status reaches the digest

- **WHEN** a note ends the run at `status: draft`
- **THEN** the returned line SHALL end with `status draft`

#### Scenario: Digest line is the only return value

- **WHEN** persistence succeeds
- **THEN** the skill SHALL return the line `Knowledge: persisted <runId> → <root> (<p> packages, <h> hubs, <d> distilled, status <ok|draft>)` and nothing else

---

### Requirement: Main-window context diet

The main conversation SHALL receive only the one-line digest. It SHALL NOT read run-note bodies, package-hub bodies, `research.md`, `dossier.md` or any other run artefact in order to persist; every read of note or research content SHALL happen inside a script or inside the single subagent.

#### Scenario: Main window reads no bodies

- **WHEN** the skill persists a run
- **THEN** no note body, hub body, `research.md` or `dossier.md` SHALL be read into the main conversation

#### Scenario: Only the digest surfaces

- **WHEN** the skill returns
- **THEN** the main conversation SHALL hold the digest line and the paths it names, and no artefact content

---

### Requirement: Idempotency on re-persist

Re-persisting the same `runId` SHALL be idempotent. The raw copy under the knowledge root SHALL be overwritten, the run note SHALL be regenerated, and each hub section identified by its `<!-- run:<runId> … -->` marker SHALL be replaced in place.

A second persist of the same run SHALL NOT append a duplicate hub section, SHALL NOT create a second run note, and SHALL NOT duplicate an entry in `index.json`.

A different range for the same package SHALL append a new section rather than replace an existing one.

#### Scenario: Re-persist replaces by marker

- **WHEN** a run already persisted is persisted again
- **THEN** each hub section carrying that run's marker SHALL be replaced in place
- **AND** the hub SHALL hold the same number of sections as before

#### Scenario: No duplicate note or index entry

- **WHEN** the same `runId` is persisted twice
- **THEN** exactly one run note SHALL exist for it
- **AND** `index.json` SHALL carry exactly one entry for it

#### Scenario: New range appends

- **WHEN** a later run persists a different range of an already-hubbed package
- **THEN** a new section SHALL be appended to that hub
- **AND** the existing sections SHALL be left unchanged

---

### Requirement: Legacy run handling

A run directory without an `outcome.json` SHALL be persisted with a reconstructed one: mechanism `reconstructed`, `gateOption: unknown`, changeset counts parsed from the changeset files, and bump results inferred from the apply logs present in the run directory.

A run whose single-project `research.md` predates the universal / this-project split SHALL have its hub `### Universal` slot emitted empty with a `<!-- distill -->` marker, so the subagent distils the universal findings out of the mixed sections; the resulting run note SHALL carry `distilled: true` and the count SHALL appear as `<d> distilled` in the digest.

#### Scenario: Missing outcome.json reconstructed

- **WHEN** a selected run directory has no `outcome.json`
- **THEN** one SHALL be reconstructed with mechanism `reconstructed` and `gateOption: unknown`

#### Scenario: Pre-split research distilled

- **WHEN** a run's single-project `research.md` has no universal / this-project split
- **THEN** the hub's `### Universal` slot SHALL be emitted empty with `<!-- distill -->`
- **AND** the run note SHALL carry `distilled: true`

---

### Requirement: Failure isolation

A persist failure SHALL NOT abort the run, alter the apply summary, or block cleanup. The skill SHALL surface exactly one line, `Knowledge: not persisted (<reason>)`, and the run SHALL continue to the `delete-plan` / `keep-plan` prompt.

The skill SHALL NOT modify, reorder or remove any section of the run's apply summary; its only contribution to the summary is the `Knowledge:` line.

#### Scenario: Persist fails, run continues

- **WHEN** any persist step errors
- **THEN** the skill SHALL print `Knowledge: not persisted (<reason>)`
- **AND** the run SHALL still reach the `delete-plan` / `keep-plan` prompt

#### Scenario: Apply summary untouched

- **WHEN** the skill runs, whether it succeeds or fails
- **THEN** the apply sections of the summary SHALL be byte-identical to what they would be without persistence

#### Scenario: Failure does not mask apply results

- **WHEN** apply succeeded and persist failed
- **THEN** the summary SHALL still report the apply as successful

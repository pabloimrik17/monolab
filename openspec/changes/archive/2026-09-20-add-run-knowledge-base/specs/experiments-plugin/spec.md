## MODIFIED Requirements

### Requirement: Plugin Manifest Content

The plugin manifest SHALL include:

- `name`: "experiments"
- `version`: Starting at "0.1.0"
- `description`: "Beta skills and commands staging area for monolab"
- `keywords`: ["experiments", "beta", "staging", "skills"]

The manifest SHALL also declare a `userConfig` block. This change adds exactly one key to it, `knowledge_root`, with `type` `"string"`, a `title`, a short user-facing `description` of its purpose, and `default` `""`.

The empty default SHALL mean the built-in knowledge root `~/.claude/experiments/knowledge/`; a non-empty value SHALL override it. The manifest SHALL declare the key and its default only — resolving, expanding and validating the value is the knowledge store's contract, not the manifest's.

#### Scenario: Manifest has required fields

- **WHEN** parsing `plugin.json`
- **THEN** all required fields SHALL be present and valid

#### Scenario: `knowledge_root` declared with an empty default

- **WHEN** parsing `plugin.json`
- **THEN** `userConfig.knowledge_root` SHALL be present with `type: "string"`, a `title`, a `description` and `default: ""`
- **AND** the `description` SHALL explain that the setting selects the persisted run-knowledge directory
- **AND** the empty default SHALL mean the built-in root `~/.claude/experiments/knowledge/`

---

### Requirement: Deep-update artifact glossary

The deep-update family SHALL use three distinct, non-colliding artifact names to eliminate confusion with Claude Code plan mode:

- `dossier.md` — the single global, deduplicated research document (formerly `plan.md`).
- `changeset.md` — a per-project concrete apply plan (target file paths, before/after snippets, exact old/new strings).
- Claude Code **plan mode** — the harness feature only.

No pipeline artifact SHALL be named `plan.md`. The internal research phase formerly named `planning` SHALL be named `synthesis`. Within the deep-update family's command and skill prose, the word "plan"/"planning" SHALL refer only to Claude Code plan mode, with these retained legacy names carved out: the run-directory storage path `~/.claude/experiments/plans/` and its derived terms ("plan directory", "plan-dir", `planDirName` — kept for on-disk compatibility), and the `## PR plan` section name produced by `partition-breaking-changes`. Files outside the deep-update family (e.g. the shallow update commands) are outside this requirement's scope.

The same reservation SHALL extend to the knowledge root (`~/.claude/experiments/knowledge/`, or its `knowledge_root` override): no file name, directory name, frontmatter key or heading under that root SHALL contain the word "plan". The one carve-out SHALL be the opaque run identifier `runId`, whose value is the legacy `planDirName` carried over verbatim; the word SHALL NOT appear under the knowledge root in any other position. Under that root the vocabulary SHALL be run, knowledge, note and hub.

#### Scenario: No artifact named plan.md

- **WHEN** examining the artifacts a deep-update run writes under its run directory
- **THEN** the global research document SHALL be named `dossier.md`
- **AND** each per-project apply plan SHALL be named `changeset.md`
- **AND** no artifact SHALL be named `plan.md`

#### Scenario: Phase renamed to synthesis

- **WHEN** examining the research workflow's phase vocabulary
- **THEN** the synthesis phase SHALL be named `synthesis`
- **AND** SHALL NOT be named `planning`

#### Scenario: "plan" reserved for the harness feature

- **WHEN** deep-update-family command or skill prose refers to writing or reviewing a pipeline document
- **THEN** it SHALL use `dossier` or `changeset` for the artifact
- **AND** SHALL use "plan"/"planning" only for Claude Code plan mode or a carved-out legacy name (run-directory terms, `## PR plan`)

#### Scenario: No "plan" under the knowledge root

- **WHEN** examining every file name, directory name, frontmatter key and heading under the knowledge root
- **THEN** none SHALL contain the word "plan"
- **AND** the only permitted occurrence SHALL be inside the value of the opaque `runId`, which is the legacy `planDirName`
- **AND** the naming vocabulary SHALL be run, knowledge, note and hub

---

### Requirement: Main-window context diet

The orchestrator (main conversation) SHALL hold only paths and small status digests (target ≤ ~30 lines each; structured tables such as the bump set may exceed the target but SHALL remain bounded digests, never full artifact bodies) during a deep-update run; it SHALL NOT load changelog bodies, per-group research files, or the dossier into its own context. `ncu`/install output SHALL be redirected to on-disk logs; the main SHALL receive a digest and, on failure only, a bounded tail (at most ~40 lines). Verbatim streaming of `ncu`/install output into the main conversation SHALL NOT occur.

Knowledge recall and knowledge persistence SHALL each contribute exactly one line to the main. Recall's line SHALL be selected from the authoritative recall result: `Knowledge: no base at <root>` when `baseAbsent` is true; `Knowledge: recall failed (<reason>)` when `error` is present or no usable matcher result exists; otherwise `Knowledge: <e> exact, <o> overlap, <p> prior, <r> related of <n> packages`. Persistence's line SHALL be `Knowledge: persisted <runId> → <root> (<p> packages, <h> hubs, <d> distilled, status <ok|draft>)`, or `Knowledge: not persisted (<reason>)` when persistence is skipped or fails.

The main SHALL NOT load run-note bodies, package-hub bodies, or `outcome.json` into its own context at any point of a deep-update run. The per-package summaries that fill those notes SHALL be written by a subagent, and every other read of note or run content for knowledge purposes SHALL happen inside a script or a subagent.

#### Scenario: Install output goes to disk, not the main window

- **WHEN** a bump/install runs during apply
- **THEN** its stdout/stderr SHALL be written to an on-disk log
- **AND** the main SHALL receive a digest, with a bounded tail surfaced only on failure

#### Scenario: Heavy content stays out of the main context

- **WHEN** the pipeline produces changelogs, research files, or the dossier
- **THEN** the main SHALL reference them by path
- **AND** SHALL NOT ingest their full contents to reach the apply phase

#### Scenario: Knowledge steps contribute one digest line each

- **WHEN** a deep-update run performs knowledge recall and then knowledge persistence
- **THEN** the main SHALL receive exactly one line from recall and exactly one line from persistence
- **AND** SHALL NOT load run-note bodies, package-hub bodies, or `outcome.json`
- **AND** the per-package summaries SHALL be written by a subagent, not by the main

## ADDED Requirements

### Requirement: Run knowledge registration

The `experiments` plugin SHALL provide the two run-knowledge skills and the two run-knowledge commands, auto-discovered from the plugin's `skills/` and `commands/` directories with no manifest hand-edit. The skills are `persist-run-knowledge` and `recall-run-knowledge`; the commands are `/experiments:knowledge-persist` and `/experiments:knowledge-recall`.

The plugin `README.md` SHALL list the two new skills and the two new commands alongside the existing entries.

The `claude-plugins/experiments/scripts/README.md` table SHALL gain one row per new script — `copy-run-knowledge.mjs`, `check-knowledge-note.mjs`, `build-knowledge-index.mjs` and `match-knowledge.mjs` — and the existing `check-dossier.mjs` row SHALL record that the script now accepts the optional `## Prior runs` dossier section.

The new scripts' tests SHALL run through `pnpm --filter @m0n0lab/plugin-experiments run test:unit`.

No manual version edits SHALL be made to `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, or the repo-root marketplace manifest at `/.claude-plugin/marketplace.json` as part of this change — the version bump is release-please's responsibility. Adding the `userConfig` block to `plugin.json` is a manifest content edit and SHALL NOT be accompanied by a version change.

#### Scenario: Skills auto-discovered

- **WHEN** examining the plugin structure
- **THEN** `skills/persist-run-knowledge/SKILL.md` and `skills/recall-run-knowledge/SKILL.md` SHALL exist
- **AND** neither SHALL be registered by hand in `plugin.json`

#### Scenario: Commands auto-discovered

- **WHEN** examining the plugin structure
- **THEN** `commands/knowledge-persist.md` and `commands/knowledge-recall.md` SHALL exist
- **AND** neither SHALL be registered by hand in `plugin.json`

#### Scenario: README listing updated

- **WHEN** examining `claude-plugins/experiments/README.md`
- **THEN** it SHALL list `persist-run-knowledge`, `recall-run-knowledge`, `/experiments:knowledge-persist`, and `/experiments:knowledge-recall`

#### Scenario: Scripts README table updated

- **WHEN** examining `claude-plugins/experiments/scripts/README.md`
- **THEN** it SHALL have a row for `copy-run-knowledge.mjs`, `check-knowledge-note.mjs`, `build-knowledge-index.mjs`, and `match-knowledge.mjs`
- **AND** the `check-dossier.mjs` row SHALL record the optional `## Prior runs` section it now accepts

#### Scenario: Tests run through the plugin's unit target

- **WHEN** running the tests of the new scripts
- **THEN** they SHALL run via `pnpm --filter @m0n0lab/plugin-experiments run test:unit`

#### Scenario: No manual version edits

- **WHEN** examining the diff for this change
- **THEN** `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, and the repo-root `/.claude-plugin/marketplace.json` SHALL NOT have manual version edits

---

### Requirement: Knowledge steps belong to the shared deep contract

The knowledge recall step (after grouping, before the workflow dispatch), the knowledge persistence step (after apply, before the `delete-plan` / `keep-plan` cleanup prompt), and the `_meta.json` `phase: "executing"` / `phase: "done"` writes SHALL be part of the single parameterized deep contract, in both the single-project orchestrator and the cross-project orchestrator.

Being part of the shared contract, the three SHALL apply at every level — `patch`, `minor`, `major` and `engines` — and SHALL NOT be restated per level. A per-level file SHALL NOT carry its own copy of them, and SHALL NOT redefine, weaken or omit them.

The shallow update commands are outside this requirement: they SHALL NOT perform recall, SHALL NOT perform persistence, and SHALL NOT write `phase` values.

#### Scenario: An engines deep run recalls and persists

- **WHEN** a deep-update run at level `engines` groups its update set and later reaches apply
- **THEN** it SHALL perform recall after grouping and before the workflow dispatch
- **AND** SHALL perform persistence after apply and before the cleanup prompt
- **AND** SHALL have written `phase: "executing"` at the start of apply and `phase: "done"` once apply completed

#### Scenario: Levels inherit rather than restate

- **WHEN** examining the per-level deep contracts for `patch`, `minor`, `major` and `engines`
- **THEN** none SHALL carry its own statement of the recall step, the persist step, or the phase writes
- **AND** all four SHALL inherit them from the shared contract

#### Scenario: A shallow run does neither

- **WHEN** a shallow update command runs to completion
- **THEN** it SHALL NOT perform recall
- **AND** SHALL NOT perform persistence
- **AND** SHALL NOT write to the knowledge root

## ADDED Requirements

### Requirement: Deep-update artifact glossary

The deep-update family SHALL use three distinct, non-colliding artifact names to eliminate confusion with Claude Code plan mode:

- `dossier.md` — the single global, deduplicated research document (formerly `plan.md`).
- `changeset.md` — a per-project concrete apply plan (target file paths, before/after snippets, exact old/new strings).
- Claude Code **plan mode** — the harness feature only.

No pipeline artifact SHALL be named `plan.md`. The internal research phase formerly named `planning` SHALL be named `synthesis`. The word "plan"/"planning" SHALL be reserved exclusively for Claude Code plan mode in all command and skill prose.

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

- **WHEN** command or skill prose refers to writing or reviewing a document
- **THEN** it SHALL use `dossier` or `changeset` for the artifact
- **AND** SHALL use "plan mode" only when referring to the Claude Code harness feature

### Requirement: Changelog fetch is a deterministic executable

Changelog retrieval SHALL be performed by a deterministic plugin executable (preserving the `npm-changelog` cache contract), not by a prose instruction an agent may skip. Research subagents SHALL invoke the executable per package; the step SHALL either complete or return a structured error, and SHALL NOT be satisfiable without producing (or explicitly erroring on) cache entries.

#### Scenario: Fetch runs as a script per package

- **WHEN** the research phase processes a package
- **THEN** it SHALL invoke the changelog-fetch executable for that package and version range
- **AND** the executable SHALL write the changelog to the cache or record a structured per-package error

#### Scenario: Missing changelog is recorded, not skipped silently

- **WHEN** the changelog-fetch executable cannot find a changelog source (e.g. `@types/*`, internal-only packages)
- **THEN** it SHALL record a structured error for that package
- **AND** processing SHALL continue to the next package rather than aborting the group

#### Scenario: Fetch cannot be bypassed under context pressure

- **WHEN** the pipeline reaches the dossier gate
- **THEN** the dossier compliance check SHALL fail unless the changelog cache contains an entry (or a recorded error) for every package in the bump set

### Requirement: Chronology assembled by script from cache

The `## Changelogs` chronology section SHALL be assembled by a deterministic script from the on-disk changelog cache and linked or embedded by the dossier. No agent SHALL re-type changelog bodies into the dossier.

#### Scenario: Chronology built from cache

- **WHEN** the dossier is assembled
- **THEN** the `## Changelogs` section SHALL be produced by a script reading the changelog cache
- **AND** SHALL cover every package present in the bump set (with a per-package sentinel where no changelog is available)

#### Scenario: No changelog bodies re-typed by an agent

- **WHEN** examining how the chronology section is produced
- **THEN** its content SHALL originate from the script-assembled cache read
- **AND** SHALL NOT be re-authored from an agent's context

### Requirement: Dossier synthesis by teammate with two-layer compliance check

The global dossier SHALL be authored by a named synthesizer teammate and validated before it is shown to the user. Validation SHALL comprise (1) a deterministic layer that asserts structural completeness against the changelog cache and bump set (every bump-set package has a chronology block; required headings present; empty sections carry sentinels), and (2) a fresh-eyes subagent that checks semantic fidelity (findings are grounded in the changelogs; hints reference real areas; priorities are coherent). Violations SHALL be relayed to the still-alive synthesizer for repair; the repair loop SHALL be capped (at most 3 rounds) with residual violations escalated into the user gate rather than looped indefinitely.

#### Scenario: Dossier validated before user sees it

- **WHEN** the synthesizer teammate finishes writing `dossier.md`
- **THEN** the deterministic check SHALL run against the changelog cache and bump set
- **AND** the fresh-eyes check SHALL run
- **AND** the user gate SHALL NOT open until the dossier passes or the repair cap is reached

#### Scenario: Deterministic check catches a missing chronology block

- **WHEN** a bump-set package has no chronology block in the dossier
- **THEN** the deterministic check SHALL fail
- **AND** the violation SHALL be relayed to the synthesizer teammate for repair

#### Scenario: Repair loop is capped

- **WHEN** the dossier still fails the check after 3 repair rounds
- **THEN** the pipeline SHALL stop looping
- **AND** the residual violations SHALL be surfaced in the user gate

### Requirement: Main-window context diet

The orchestrator (main conversation) SHALL hold only paths and small status digests during a deep-update run; it SHALL NOT load changelog bodies, per-group research files, or the dossier into its own context. `ncu`/install output SHALL be redirected to on-disk logs; the main SHALL receive a digest and, on failure only, a bounded tail (at most ~40 lines). Verbatim streaming of `ncu`/install output into the main conversation SHALL NOT occur.

#### Scenario: Install output goes to disk, not the main window

- **WHEN** a bump/install runs during apply
- **THEN** its stdout/stderr SHALL be written to an on-disk log
- **AND** the main SHALL receive a digest, with a bounded tail surfaced only on failure

#### Scenario: Heavy content stays out of the main context

- **WHEN** the pipeline produces changelogs, research files, or the dossier
- **THEN** the main SHALL reference them by path
- **AND** SHALL NOT ingest their full contents to reach the apply phase

### Requirement: Per-project apply gate with turn-boundary pause

Per project, a single teammate SHALL perform reconnaissance and write `changeset.md` as its turn-1 task, then end its turn (pausing at the turn boundary) without modifying any source file. Before opening the user gate, the orchestrator SHALL run a deterministic check that no source file was modified during turn 1; if a file was modified, the run SHALL abort for that project. The human approval gate SHALL be owned by the orchestrator, not by the teammate's native plan-mode approval (which is decided by the lead autonomously and never reaches the human). On approval the orchestrator SHALL send the still-alive teammate a proceed instruction to apply; on reject-with-feedback it SHALL relay the feedback for the teammate to revise `changeset.md` and re-present. Teammate completion messages SHALL NOT be trusted; the orchestrator SHALL verify the applied result on disk.

#### Scenario: Teammate pauses before editing

- **WHEN** the apply teammate completes turn 1
- **THEN** `changeset.md` SHALL exist with concrete edits
- **AND** no source file SHALL have been modified
- **AND** the orchestrator's pre-gate check SHALL confirm the source is untouched

#### Scenario: Early edit aborts the project

- **WHEN** the pre-gate check finds a source file was modified during turn 1
- **THEN** the run SHALL abort for that project without opening the user gate

#### Scenario: Approval resumes the same teammate to apply

- **WHEN** the user approves the changeset
- **THEN** the orchestrator SHALL NOT apply edits itself
- **AND** SHALL send the still-alive teammate a proceed instruction
- **AND** the teammate SHALL apply the approved edits with its reconnaissance context intact

#### Scenario: Result verified on disk

- **WHEN** the teammate reports the apply is complete
- **THEN** the orchestrator SHALL verify the applied changes on disk
- **AND** SHALL NOT rely on the teammate's completion message alone

### Requirement: Human approval gate interface

The per-project human approval gate SHALL default to the orchestrator's plan mode as its review/iteration surface: the orchestrator enters plan mode, presents the changeset via the plan-approval flow, and on approval leaves plan mode and delegates the apply to the teammate rather than implementing in the main. (The orchestrator's own plan-approval flow is empirically verified to block for the human even under `defaultMode: "auto"`.) The fallback interface SHALL be `AskUserQuestion` showing the changeset digest, used only when the orchestrator's plan-mode approval is unavailable or non-blocking in the active runtime (e.g. non-interactive execution). In either case the gate SHALL block for the human, and approval SHALL result in delegating the apply to the teammate.

#### Scenario: Primary — plan mode used only to gate

- **WHEN** the orchestrator presents a changeset via plan mode
- **THEN** approval SHALL NOT cause the main to implement the edits
- **AND** the orchestrator SHALL delegate the apply to the teammate

#### Scenario: Fallback — AskUserQuestion gate

- **WHEN** the orchestrator's plan-mode approval is unavailable or non-blocking in the active runtime (e.g. non-interactive execution)
- **THEN** the gate SHALL be presented via `AskUserQuestion` with the changeset digest
- **AND** approval SHALL delegate the apply to the teammate

### Requirement: Sequential cross-project apply with stop-on-fail

In the cross-project (`commander-update-deep-*`) flow, per-project apply SHALL run sequentially. On a per-project failure the run SHALL pause and ask the user whether to stop or continue with the remaining projects, rather than silently continuing or aborting the whole run.

#### Scenario: Failure pauses for a user decision

- **WHEN** applying to a project fails
- **THEN** the run SHALL pause
- **AND** SHALL ask the user whether to stop or continue with the remaining projects

### Requirement: Research fan-out gates at the workflow boundary

The research fan-out (scan → fetch → research → chronology → dossier check) MAY be orchestrated as a background workflow with journaled, resumable steps. Because a background workflow cannot prompt the user mid-flight, all user gates SHALL be placed at the post-fan-out boundary, not inside the fan-out. When a resumable workflow is used, its journal SHALL be the single resume source of truth (no parallel phase-state file).

#### Scenario: No mid-fan-out user prompt

- **WHEN** the research fan-out runs as a background workflow
- **THEN** user gates SHALL occur only after the fan-out returns
- **AND** SHALL NOT be required mid-fan-out

#### Scenario: Single resume source of truth

- **WHEN** a resumable workflow orchestrates the fan-out
- **THEN** resume SHALL be driven by the workflow journal
- **AND** SHALL NOT rely on a separate phase-state file

### Requirement: Deep command family consolidation

The deep-update commands SHALL share a single parameterized contract plus a per-level delta table (patch/minor/major/engines) rather than duplicating a near-identical prose contract across separate files. A behavioral rule (e.g. the requirement to include the `## Changelogs` chronology) SHALL be expressed once and apply to every level, so it cannot be present in one level's file and absent in another's.

#### Scenario: Shared behavior expressed once

- **WHEN** examining the deep-update command contract
- **THEN** behavior common to all levels SHALL be defined once in a shared contract
- **AND** SHALL NOT be independently restated per level in a way that can drift

#### Scenario: Level differences captured in a delta table

- **WHEN** a level introduces level-specific behavior (e.g. major adds breaking-change partitioning; engines uses toolchain surfaces)
- **THEN** that difference SHALL be captured in the per-level delta table
- **AND** the shared contract SHALL remain the single source for common behavior

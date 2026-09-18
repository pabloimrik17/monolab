## Purpose

Provides the manual entry point to persistence — the tool that seeds the knowledge base from run directories that are already on disk, and the way to re-persist a kept run without waiting for the next deep run to end.

## ADDED Requirements

### Requirement: Command file exists

The command SHALL exist at `claude-plugins/experiments/commands/knowledge-persist.md` and SHALL be invocable as `/experiments:knowledge-persist`.

Its frontmatter SHALL carry a `description`, and its body SHALL read its arguments from `$ARGUMENTS`.

#### Scenario: Command file location

- **WHEN** examining the experiments plugin structure
- **THEN** `commands/knowledge-persist.md` SHALL exist with a `description` in its frontmatter

#### Scenario: Arguments read from $ARGUMENTS

- **WHEN** examining the command body
- **THEN** it SHALL take its run directories and flags from `$ARGUMENTS`

---

### Requirement: Command delegates to the persist skill

The command SHALL delegate the work to the `persist-run-knowledge` skill. It SHALL NOT restate the persist procedure, the note or hub templates, the validator rules, or the repair loop.

#### Scenario: Delegation

- **WHEN** the command is invoked with at least one selected run
- **THEN** it SHALL invoke the `persist-run-knowledge` skill

#### Scenario: No duplicated procedure

- **WHEN** examining the command file
- **THEN** it SHALL NOT contain the copy, subagent, validation or index steps
- **AND** SHALL NOT contain note or hub templates

---

### Requirement: Argument handling

The command SHALL accept `[<run-dir>…] [--synthetic]`: zero or more run directories and an optional flag.

Every explicitly passed path SHALL be validated before use: a path that does not exist, or that exists but contains no `_meta.json`, SHALL be refused with a one-line message naming it, and the command SHALL NOT persist it.

`--synthetic` SHALL tag every run selected in that invocation as synthetic, whether the runs were passed explicitly or chosen by default selection. Without the flag, no run SHALL be tagged synthetic.

#### Scenario: Explicit paths persisted

- **WHEN** the command is invoked with two run directories that each contain a `_meta.json`
- **THEN** both SHALL be persisted
- **AND** no default selection SHALL be offered

#### Scenario: Invalid path refused

- **WHEN** a passed path does not exist or contains no `_meta.json`
- **THEN** the command SHALL refuse it with a one-line message naming the path
- **AND** SHALL NOT persist it

#### Scenario: Synthetic flag applies to the whole invocation

- **WHEN** the command is invoked with `--synthetic` and four run directories
- **THEN** all four runs SHALL be tagged synthetic

---

### Requirement: Default selection when no run directory is given

Invoked with no run directory, the command SHALL build the candidate set from every directory under `~/.claude/experiments/plans/` whose `_meta.json` has `phase` equal to `"done"` and whose `runId` is absent from the knowledge base's `index.json`.

The candidates SHALL be presented through `AskUserQuestion` as a multi-select defaulting to all of them, and only the runs the user confirms SHALL be persisted.

When no candidate is eligible, the command SHALL print a single line saying so and SHALL exit without prompting and without writing anything.

#### Scenario: Eligible runs offered

- **WHEN** the command is invoked with no argument and six directories are `phase: "done"` and absent from `index.json`
- **THEN** all six SHALL be offered through `AskUserQuestion` as a multi-select defaulting to all

#### Scenario: Already persisted runs excluded

- **WHEN** a `phase: "done"` directory's `runId` is already present in `index.json`
- **THEN** it SHALL NOT appear in the default candidate set

#### Scenario: Nothing eligible

- **WHEN** no directory is both `phase: "done"` and absent from `index.json`
- **THEN** the command SHALL print a single line and exit
- **AND** SHALL NOT prompt and SHALL NOT write anything

---

### Requirement: Stalled runs are excluded

A run directory whose `_meta.json.phase` is anything other than `"done"` — a run stalled at `synthesis`, for example — SHALL NOT appear in the default candidate set.

Passed explicitly, such a directory SHALL be refused with a one-line message naming it and its phase, and the command SHALL persist nothing for it. The command SHALL NOT offer to force it and SHALL NOT alter its `_meta.json`.

#### Scenario: Stalled run not offered

- **WHEN** a run directory is at `phase: "synthesis"` and the command is invoked with no argument
- **THEN** that directory SHALL NOT appear among the candidates

#### Scenario: Stalled run passed explicitly

- **WHEN** a `phase: "synthesis"` directory is passed as an explicit argument
- **THEN** the command SHALL refuse it with a one-line message naming it and its phase
- **AND** SHALL NOT persist it and SHALL NOT modify its `_meta.json`

---

### Requirement: Sequential delegation and output

The command SHALL invoke `persist-run-knowledge` once per selected run, one run at a time, never concurrently.

It SHALL print one digest line per run — the line the skill returns — followed by a single final line counting the runs persisted. It SHALL NOT print note bodies, hub bodies or research content.

The command SHALL NOT create commits, branches or pull requests, SHALL NOT modify any project file, and SHALL NOT read or write `~/.claude/commander/projects.json`.

#### Scenario: One invocation per run, in sequence

- **WHEN** three runs are selected
- **THEN** `persist-run-knowledge` SHALL be invoked three times, sequentially

#### Scenario: Output is digests plus a count

- **WHEN** three runs are persisted
- **THEN** three digest lines SHALL be printed, one per run
- **AND** a single final line SHALL state how many runs were persisted

#### Scenario: A failing run does not stop the rest

- **WHEN** one selected run fails to persist
- **THEN** its `Knowledge: not persisted (<reason>)` line SHALL be printed
- **AND** the remaining selected runs SHALL still be attempted

#### Scenario: No repository or registry side effects

- **WHEN** the command completes
- **THEN** no commit, branch or pull request SHALL have been created
- **AND** no project file and no Commander registry file SHALL have been read or written

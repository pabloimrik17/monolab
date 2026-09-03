## Purpose

Removes prose comment noise from a branch's changes after an implementation is finished, applying the same policy that governs writing them, without pulling every touched file through the main context window.

## ADDED Requirements

### Requirement: Skill file exists

The skill SHALL exist at `claude-plugins/experiments/skills/purge-comment-noise/SKILL.md` with YAML frontmatter containing `name: purge-comment-noise` and a `description` that triggers on completion of an extensive implementation.

#### Scenario: Skill file location

- **WHEN** examining the experiments plugin structure
- **THEN** `skills/purge-comment-noise/SKILL.md` SHALL exist with frontmatter `name: purge-comment-noise`

---

### Requirement: Policy is sourced, not restated

The skill SHALL read the comment policy from `${CLAUDE_PLUGIN_ROOT}/skills/writing-comments/reference/policy.md`. It SHALL NOT carry its own copy of the rules.

#### Scenario: Policy resolved at runtime

- **WHEN** the skill runs
- **THEN** it SHALL read the policy from the `writing-comments` skill via `${CLAUDE_PLUGIN_ROOT}`

#### Scenario: Policy changes propagate

- **WHEN** `reference/policy.md` is edited
- **THEN** the purge behaviour SHALL follow the edited policy with no change to the purge skill

---

### Requirement: Diff scope

By default the skill SHALL consider the branch's changes against its base branch plus uncommitted working-tree changes.

Only comments on lines added or modified by that diff SHALL be candidates. Pre-existing comments in a touched file SHALL NOT be modified.

The skill SHALL accept an override argument naming either a git ref or one or more paths, and SHALL restrict the scope to it when given.

#### Scenario: Default scope

- **WHEN** the skill runs with no argument on a branch based on `develop`
- **THEN** the candidate set SHALL be the comments on lines added or modified in `develop...HEAD` plus the uncommitted working tree

#### Scenario: Pre-existing comment left alone

- **WHEN** a touched file contains a prose comment on a line the diff did not add or modify
- **THEN** that comment SHALL NOT be deleted or edited

#### Scenario: Ref override

- **WHEN** the skill is invoked with `HEAD~3`
- **THEN** the scope SHALL be the changes since that ref

#### Scenario: Path override

- **WHEN** the skill is invoked with one or more paths
- **THEN** only those paths SHALL be considered

---

### Requirement: File coverage and exclusions

The skill SHALL consider source files with the extensions `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, and `.vue` or `.svelte` where present.

The skill SHALL exclude generated files, database migrations, test snapshots, `node_modules`, and every non-code file including Markdown, YAML, JSON, and shell scripts.

Test files SHALL be included. Within tests, a comment explaining *why* a case exists — a regression, a specific reported bug — SHALL be retained as a justified category.

#### Scenario: Test file included

- **WHEN** a `.spec.ts` file in scope contains a prose comment restating an assertion
- **THEN** the comment SHALL be deleted

#### Scenario: Regression rationale retained

- **WHEN** a test comment records the bug a case guards against
- **THEN** the comment SHALL be retained

#### Scenario: Markdown untouched

- **WHEN** the diff includes a `.md` file
- **THEN** it SHALL NOT be processed

#### Scenario: Generated file untouched

- **WHEN** the diff includes a generated or migration file
- **THEN** it SHALL NOT be processed

---

### Requirement: Autonomous trigger threshold

The skill's `description` SHALL express a measurable trigger condition: the scope contains at least 5 changed files **or** at least 150 added lines relative to the base branch.

An agent evaluating the trigger SHALL measure the scope (for example with `git diff --stat`) rather than judge "extensive" qualitatively.

Explicit invocation SHALL bypass the threshold entirely.

#### Scenario: Below threshold

- **WHEN** a refinement changes 2 files and 30 lines
- **THEN** the skill SHALL NOT trigger autonomously

#### Scenario: At threshold

- **WHEN** an implementation changes 7 files
- **THEN** the skill SHALL be eligible to trigger autonomously

#### Scenario: Manual invocation below threshold

- **WHEN** the user invokes the skill explicitly on a 1-file change
- **THEN** the skill SHALL run

---

### Requirement: Fan-out threshold and contract

When the scope exceeds 8 changed files **or** 400 changed lines, the skill SHALL distribute the work; at or below that, it SHALL process in line without spawning agents.

Distribution SHALL prefer teammates and SHALL fall back to subagents when teammates are unavailable.

Work SHALL be split by whole file. A file SHALL NOT be split across agents by hunk.

Each agent SHALL apply its edits directly to its assigned files and SHALL return only a count of deletions and edits plus at most 5 cases it judged doubtful. Agents SHALL NOT return comment bodies or file contents.

#### Scenario: Below fan-out threshold

- **WHEN** the scope is 6 files and 200 lines
- **THEN** the skill SHALL process in line without spawning agents

#### Scenario: Above fan-out threshold

- **WHEN** the scope is 20 files
- **THEN** the work SHALL be distributed, preferring teammates

#### Scenario: Teammates unavailable

- **WHEN** the scope exceeds the threshold and teammates are unavailable
- **THEN** subagents SHALL be used

#### Scenario: Whole-file assignment

- **WHEN** work is distributed
- **THEN** every file SHALL be assigned in full to exactly one agent

#### Scenario: Agent return payload

- **WHEN** an agent finishes its assignment
- **THEN** it SHALL return counts and at most 5 doubtful cases
- **AND** SHALL NOT return comment bodies or file contents

---

### Requirement: Edits are applied directly

The skill SHALL apply deletions and edits to the files directly. It SHALL NOT request per-comment approval and SHALL NOT stage a diff for review before applying.

Retained comments SHALL be tightened to be short and specific where they are verbose.

#### Scenario: Direct application

- **WHEN** the skill identifies a comment to delete
- **THEN** it SHALL delete it without asking for approval

#### Scenario: Retained but verbose

- **WHEN** a retained comment carries a justified reason across several verbose sentences
- **THEN** it SHALL be tightened while preserving the information

---

### Requirement: Report format

On completion the skill SHALL report a compact table mapping each processed file to its count of deleted and edited comments.

The report SHALL NOT include the bodies of deleted or edited comments.

The report SHALL list any `TODO` or `FIXME` deleted for lacking an issue reference, and SHALL note that these could be filed as tracker issues. The skill SHALL NOT create tracker issues itself.

#### Scenario: Compact report

- **WHEN** the purge completes across 12 files
- **THEN** the report SHALL be a table of file to deleted and edited counts
- **AND** SHALL NOT quote the removed comments

#### Scenario: Unreferenced TODO removed

- **WHEN** an unreferenced `TODO` is deleted
- **THEN** the report SHALL list it and suggest filing it
- **AND** no tracker issue SHALL be created

---

### Requirement: No forced verification gate

The skill SHALL NOT run the repository's typecheck, lint, test, or build targets, and SHALL NOT block on them.

The report SHALL recommend running the repository's gates before committing, covering both the purge's edits and any source changes that were already uncommitted.

#### Scenario: Gates not run

- **WHEN** the purge completes
- **THEN** no verification target SHALL have been executed by the skill

#### Scenario: Recommendation emitted

- **WHEN** the purge completes
- **THEN** the report SHALL recommend running the repository's gates before committing, including pre-existing uncommitted source changes

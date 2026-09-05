# writing-comments-skill Specification

## Purpose

Defines the canonical policy for which code comments are worth writing, and applies it while code is being written so prose noise never enters the diff in the first place.

## Requirements

### Requirement: Skill file exists

The skill SHALL exist at `claude-plugins/experiments/skills/writing-comments/SKILL.md` with YAML frontmatter containing `name: writing-comments` and a `description` that triggers when an agent is about to write or edit comments in code.

#### Scenario: Skill file location

- **WHEN** examining the experiments plugin structure
- **THEN** `skills/writing-comments/SKILL.md` SHALL exist with frontmatter `name: writing-comments`

---

### Requirement: Canonical policy location

The comment policy SHALL live at `claude-plugins/experiments/skills/writing-comments/reference/policy.md` and SHALL be the single source of truth. No other artifact in this change SHALL restate the policy; consumers reference this file.

#### Scenario: Policy file exists

- **WHEN** examining the skill directory
- **THEN** `reference/policy.md` SHALL exist

#### Scenario: No duplicated policy

- **WHEN** examining `purge-comment-noise/SKILL.md` and `commands/purge-comments.md`
- **THEN** neither SHALL contain a restatement of the policy rules
- **AND** `purge-comment-noise/SKILL.md` SHALL reference `reference/policy.md` instead
- **AND** `commands/purge-comments.md` SHALL delegate to the `purge-comment-noise` skill, which references it

---

### Requirement: Policy scope is drawn by comment kind

The policy SHALL apply only to free-form prose comments written as narration, in whichever comment form the source language uses (for example `//`, `#`, `--` line comments and `/* */`, `<!-- -->` block comments).

The following SHALL be out of scope by construction and SHALL NOT be deleted or edited:

- API doc blocks (JSDoc/TSDoc `/** */`, Python docstrings and equivalents), including those on non-exported symbols
- Tool pragmas and suppressions (for example `eslint-disable`, `@ts-expect-error`, `biome-ignore`, `# noqa`, `# type: ignore`)
- Licence headers
- Tool directives (for example shebangs, `@vitest-environment`, bundler or codegen markers)

#### Scenario: Prose comment is in scope

- **WHEN** the policy is applied to a `//` comment narrating what the next line does
- **THEN** the comment SHALL be treated as in scope

#### Scenario: Non-brace-language comment is in scope

- **WHEN** the policy is applied to a Python `#` comment restating the line below it
- **THEN** the comment SHALL be treated as in scope

#### Scenario: TSDoc on an internal symbol is out of scope

- **WHEN** a `/** */` block documents a non-exported function
- **THEN** it SHALL NOT be deleted or edited, regardless of length

#### Scenario: Pragma is out of scope

- **WHEN** a comment is an `eslint-disable-next-line` directive
- **THEN** it SHALL NOT be deleted or edited

---

### Requirement: Deny-by-default within scope

Within the in-scope set, a comment SHALL be written only when it carries information that is not deducible from the code it accompanies. The burden SHALL rest on justifying the comment's existence, not on justifying its removal.

Justified categories SHALL include: a workaround with a link to its issue or upstream report; an invariant or precondition not expressible in the code; a non-obvious reason for a choice that looks wrong at first reading; why a test case exists — the bug it guards, the regression it pins, or the reported issue it reproduces.

Comments that restate the code, narrate the change being made, announce sections (for example `// Step 1:`), or record the author's reasoning SHALL NOT be written.

A comment the user explicitly asked for SHALL be written, and SHALL be retained by the purge, overriding this requirement.

#### Scenario: Restating the code

- **WHEN** an agent is about to write `// increment the counter` above `count++`
- **THEN** the comment SHALL NOT be written

#### Scenario: Workaround with a reference

- **WHEN** code works around an upstream bug and the comment links the upstream issue
- **THEN** the comment SHALL be written

#### Scenario: Why a test case exists

- **WHEN** a comment on a test case records the bug it guards against and names the reported issue it reproduces
- **THEN** the comment SHALL be written

#### Scenario: Reasoning narration

- **WHEN** an agent is about to write a comment explaining why it chose an approach during this implementation
- **THEN** the comment SHALL NOT be written

#### Scenario: Explicitly requested comment

- **WHEN** the user explicitly asks for a comment this requirement would otherwise reject
- **THEN** the comment SHALL be written
- **AND** the purge SHALL retain it

---

### Requirement: Forward-only application

The skill SHALL govern comments written from the moment of its invocation onward, including comments written into files that were already modified earlier in the same session.

The skill SHALL NOT perform a retroactive sweep of comments already written before its invocation.

#### Scenario: Comment written after invocation in a previously touched file

- **WHEN** the skill is invoked mid-session and the agent then adds a comment to a file it edited earlier in that session
- **THEN** the policy SHALL apply to that comment

#### Scenario: No retroactive sweep

- **WHEN** the skill is invoked mid-session
- **THEN** it SHALL NOT revisit or rewrite comments already present in the session's earlier edits

---

### Requirement: TODO and FIXME markers

A `TODO` or `FIXME` comment SHALL be written only when it references a real issue or ticket identifier. An unreferenced `TODO` SHALL NOT be written.

#### Scenario: Unreferenced TODO

- **WHEN** an agent is about to write `// TODO: handle the empty case`
- **THEN** the comment SHALL NOT be written

#### Scenario: Referenced TODO

- **WHEN** an agent writes `// TODO(MON-123): handle the empty case`
- **THEN** the comment SHALL be written

---

### Requirement: Comment language is preserved

The skill SHALL NOT translate comments. Language normalisation is out of scope.

#### Scenario: Existing comment in another language

- **WHEN** a retained comment is written in a language other than the surrounding codebase's
- **THEN** its language SHALL be left unchanged

---

### Requirement: Discovery pointer is proposed, never written

Once per session, the skill SHALL check whether a one-line pointer to itself exists in `~/.claude/CLAUDE.md`. When absent, the skill SHALL propose adding it and SHALL wait for explicit user confirmation before any write. The check SHALL NOT be repeated on later invocations within the same session, and a declined proposal SHALL NOT be offered again.

The skill SHALL NOT modify `~/.claude/CLAUDE.md`, any repository `CLAUDE.md`, or any `AGENTS.md` without that confirmation.

#### Scenario: Pointer missing

- **WHEN** the check runs for the first time in a session and `~/.claude/CLAUDE.md` contains no pointer to `writing-comments`
- **THEN** the skill SHALL propose adding a one-line pointer
- **AND** SHALL NOT write the file until the user confirms

#### Scenario: Pointer already present

- **WHEN** the check runs and the pointer already exists
- **THEN** the skill SHALL make no proposal and SHALL proceed silently

#### Scenario: User declines

- **WHEN** the user declines the proposal
- **THEN** no configuration file SHALL be modified
- **AND** the skill SHALL continue to apply the policy for the rest of the session
- **AND** the proposal SHALL NOT be repeated in that session

#### Scenario: Later invocation in the same session

- **WHEN** the skill is invoked again after the check has already run in this session
- **THEN** it SHALL NOT re-check `~/.claude/CLAUDE.md` and SHALL make no further proposal

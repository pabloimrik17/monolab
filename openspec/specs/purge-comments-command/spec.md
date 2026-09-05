# purge-comments-command Specification

## Purpose

Provides the explicit, user-driven entry point to the comment purge, for the cases where the autonomous threshold does not apply or the user wants to scope the run by hand.

## Requirements

### Requirement: Command file exists

The command SHALL exist at `claude-plugins/experiments/commands/purge-comments.md` and SHALL be invocable as `/experiments:purge-comments`.

#### Scenario: Command file location

- **WHEN** examining the experiments plugin structure
- **THEN** `commands/purge-comments.md` SHALL exist with a `description` in its frontmatter

---

### Requirement: Command delegates to the purge skill

The command SHALL delegate the work to the `purge-comment-noise` skill. It SHALL NOT restate the policy or reimplement the purge procedure.

#### Scenario: Delegation

- **WHEN** the command is invoked
- **THEN** it SHALL invoke the `purge-comment-noise` skill

#### Scenario: No duplicated logic

- **WHEN** examining the command file
- **THEN** it SHALL NOT contain policy rules or purge procedure steps

---

### Requirement: Argument handling

The command SHALL accept an optional argument that is either a git ref or one or more paths, and SHALL pass it to the skill as the scope override.

With no argument, the skill's default scope SHALL apply.

Invocation through the command SHALL always run, regardless of the autonomous trigger threshold.

#### Scenario: No argument

- **WHEN** `/experiments:purge-comments` is invoked with no argument
- **THEN** the skill's default scope SHALL apply

#### Scenario: Ref argument

- **WHEN** `/experiments:purge-comments HEAD~3` is invoked
- **THEN** the scope SHALL be the changes since `HEAD~3`

#### Scenario: Threshold bypassed

- **WHEN** the command is invoked on a change smaller than the autonomous threshold
- **THEN** the purge SHALL run

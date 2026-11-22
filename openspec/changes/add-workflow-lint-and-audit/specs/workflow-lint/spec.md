# Spec Delta

## Purpose

Defines the Workflow lint: the check that fails a change when a CI workflow would not run as written, where it runs, when it includes shellcheck, and how its Accepted findings are recorded.

## ADDED Requirements

### Requirement: The lint uses the pinned actionlint with the repository config

The Workflow lint SHALL run actionlint at the version `mise.toml` pins, from the `aqua:rhysd/actionlint` backend, reading `.github/actionlint.yaml`. It SHALL NOT run pyflakes. Each finding SHALL name the file, line, column and rule.

#### Scenario: Invalid expression

- **WHEN** a workflow uses an expression with an unknown context or a wrong type, or passes an input the action does not declare
- **THEN** the Workflow lint reports it with its file, line, column and rule
- **AND** exits non-zero

#### Scenario: Pinned version

- **WHEN** a different actionlint is on the developer's PATH
- **THEN** the Workflow lint still runs the version `mise.toml` pins

### Requirement: Pre-commit lints staged workflows without shellcheck

The pre-commit hook SHALL run the Workflow lint, through lint-staged, on each staged file under `.github/workflows/` ending in `.yml` or `.yaml`, and SHALL block the commit on a finding. The hook SHALL run it without shellcheck, so a shell finding never blocks a commit. When no workflow file is staged, the Workflow lint SHALL NOT run.

#### Scenario: Staged workflow with an actionlint error

- **WHEN** a developer stages a workflow with an invalid `runs-on` expression and commits
- **THEN** the commit is blocked
- **AND** the hook prints the finding

#### Scenario: Shell finding at commit time

- **WHEN** a staged workflow's only problem is an unquoted variable in a `run:` script
- **THEN** the commit proceeds

#### Scenario: No workflow staged

- **WHEN** the staged changes contain no file under `.github/workflows/`
- **THEN** the Workflow lint does not run

### Requirement: CI lints every workflow with shellcheck

The `workflows` CI job SHALL run the Workflow lint over every workflow on every pull request and every push, with shellcheck at the version `mise.toml` pins checking each `run:` script, and SHALL fail on any finding.

#### Scenario: Shell finding in CI

- **WHEN** a pull request adds a `run:` script with an unquoted variable expansion
- **THEN** the `workflows` job fails with the shellcheck finding

#### Scenario: Pull request that changes no workflow

- **WHEN** a pull request changes no workflow file
- **THEN** the `workflows` job still lints every workflow

### Requirement: Workflow lint Accepted findings are recorded with a reason

A Workflow lint finding SHALL stay in place only as an Accepted finding. A shellcheck finding is recorded on the line above the code in its `run:` script as `# shellcheck disable=SC<code> # <reason>`. Any other finding is recorded in `.github/actionlint.yaml` as an `ignore` entry for the paths it affects, matching only that finding's message, with a comment giving the reason. Neither the hook nor CI SHALL pass ignore flags on the command line.

#### Scenario: Self-repository syntax

- **WHEN** a workflow calls a same-repository reusable workflow as `uses: $/.github/workflows/<file>`, which actionlint 1.7.12 rejects
- **THEN** the Workflow lint passes on that line through the `.github/actionlint.yaml` entry
- **AND** still reports any other finding in the same file

#### Scenario: Accepted shellcheck finding

- **WHEN** a `run:` script carries `# shellcheck disable=SC<code> # <reason>` above the line shellcheck flags
- **THEN** the `workflows` job does not report that finding

### Requirement: The Workflow lint is documented

`README.md` SHALL describe actionlint under External tools: the command that runs the Workflow lint by hand from the repository root, that shellcheck runs only in CI, and how to record an Accepted finding.

#### Scenario: Developer reads README

- **WHEN** a developer looks up how to run the Workflow lint locally
- **THEN** README gives a command that runs as written from the repository root
- **AND** explains where each kind of Accepted finding is recorded

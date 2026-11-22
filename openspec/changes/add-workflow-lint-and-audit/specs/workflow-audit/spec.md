# Spec Delta

## Purpose

Defines the Workflow audit: the check that fails a change when a CI workflow could be abused, where it runs, which audits run offline and online, the hardening the workflows keep to pass it, and how its Accepted findings are recorded.

## ADDED Requirements

### Requirement: The audit uses the pinned zizmor with its defaults

The Workflow audit SHALL run zizmor at the version `mise.toml` pins, with zizmor's default persona and default audit settings. The repository SHALL NOT keep a zizmor config file that only restates those defaults. Each finding SHALL name the audit, file, line and severity.

#### Scenario: Unpinned action

- **WHEN** a workflow uses `actions/checkout@v4` or any other action by tag or branch
- **THEN** the Workflow audit reports an `unpinned-uses` finding with its file and line

#### Scenario: Pinned version

- **WHEN** a different zizmor is on the developer's PATH
- **THEN** the Workflow audit still runs the version `mise.toml` pins

### Requirement: Any audit finding blocks

The Workflow audit SHALL fail on every finding the default persona reports that is not an Accepted finding, whatever its severity or confidence, including `low` findings (labelled `help` in zizmor's text output) and `informational` ones.

#### Scenario: Low-severity finding

- **WHEN** the only finding is of `low` severity, such as a `./` same-repository reference
- **THEN** the Workflow audit exits non-zero

#### Scenario: Informational finding

- **WHEN** the only finding is `informational`, such as a low-confidence template injection from a step output
- **THEN** the Workflow audit exits non-zero

### Requirement: Pre-commit audits staged workflows offline

The pre-commit hook SHALL run the Workflow audit, through lint-staged, on each staged file under `.github/workflows/` ending in `.yml` or `.yaml`, in zizmor's offline mode even when a GitHub token is in the environment, and SHALL block the commit on a finding. When no workflow file is staged, the Workflow audit SHALL NOT run.

#### Scenario: Staged workflow with a finding

- **WHEN** a developer stages a workflow whose checkout keeps its git credential and commits
- **THEN** the commit is blocked
- **AND** the hook prints the finding

#### Scenario: Token in the environment

- **WHEN** `GH_TOKEN` is set while the hook runs
- **THEN** the Workflow audit makes no GitHub API request

#### Scenario: No workflow staged

- **WHEN** the staged changes contain no file under `.github/workflows/`
- **THEN** the Workflow audit does not run

### Requirement: CI audits the repository online

The `workflows` CI job SHALL run the Workflow audit over the repository on every pull request and every push, with the job's GitHub token so the online audits run as well, and SHALL fail on a finding. It SHALL report each finding as an annotation on the pull request, SHALL NOT upload SARIF, and SHALL keep read-only `contents` as its only permission.

#### Scenario: Version comment that does not match the pin

- **WHEN** a workflow pins an action by SHA with a `# vX.Y.Z` comment naming a tag that points to another commit
- **THEN** the `workflows` job fails with a `ref-version-mismatch` finding

#### Scenario: Finding in a pull request

- **WHEN** a pull request introduces a Workflow audit finding
- **THEN** the finding appears as an annotation on the pull request

#### Scenario: Pull request that changes no workflow

- **WHEN** a pull request changes no workflow file
- **THEN** the `workflows` job still audits every workflow, so a newly reported advisory on a pinned action fails it

### Requirement: Checkouts keep no git credential unless the job pushes

Every `actions/checkout` step SHALL set `persist-credentials: false`, except in a job that runs `git push` with that credential. Such a job SHALL set `persist-credentials: true` explicitly.

#### Scenario: Job that only reads

- **WHEN** a job checks out the repository and never pushes
- **THEN** its checkout sets `persist-credentials: false`

#### Scenario: Job that pushes

- **WHEN** the `prettify-pr` job checks out the release branch to push a formatting commit
- **THEN** its checkout sets `persist-credentials: true`

### Requirement: Permissions are granted per job

A workflow's top-level `permissions` SHALL grant no write access. Each job that needs to write SHALL declare its own permissions.

#### Scenario: Release workflow

- **WHEN** `release-please.yml` is read
- **THEN** its top-level `permissions` grants nothing
- **AND** the `release-please`, `prettify-pr`, `publish` and `back-merge` jobs each declare the permissions they use

### Requirement: Step outputs reach run scripts through the environment

A `run:` script SHALL NOT expand a step output, a workflow input or an event payload field with `${{ }}`. It SHALL read the value from an `env` entry instead.

#### Scenario: Released packages list

- **WHEN** the `publish` job uses the list of released packages in its build and summary scripts
- **THEN** both scripts read it from an environment variable

### Requirement: Same-repository references use the self-repository syntax

A `uses:` reference to an action or reusable workflow in this repository SHALL use the `$/` self-repository syntax, not a `./` workspace-relative path.

#### Scenario: CVE gate call

- **WHEN** `ci.yml` calls the CVE gate's reusable workflow
- **THEN** the `cve` job uses `$/.github/workflows/cve-scan.yml`

### Requirement: Workflow audit Accepted findings are recorded at their line

A Workflow audit finding SHALL stay in place only as an Accepted finding, recorded on the finding's line as `# zizmor: ignore[<audit>] <reason>`. An audit SHALL NOT be disabled for the whole repository, and a finding SHALL NOT be ignored by a file-and-line entry in a config file.

#### Scenario: Accepted finding

- **WHEN** a line carries `# zizmor: ignore[<audit>] <reason>`
- **THEN** the Workflow audit skips that finding on that line
- **AND** the same problem on any other line still fails it

### Requirement: The Workflow audit is documented

`README.md` SHALL describe zizmor under External tools: the command that runs the Workflow audit by hand, that the hook runs it offline while CI also runs the online audits, and how to record an Accepted finding.

#### Scenario: Developer reads README

- **WHEN** a developer looks up how to run the Workflow audit locally
- **THEN** README gives a command that runs as written
- **AND** explains that a finding is fixed, or recorded at its line with a reason

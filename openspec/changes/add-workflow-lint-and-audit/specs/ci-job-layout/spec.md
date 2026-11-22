# Spec Delta

## MODIFIED Requirements

### Requirement: Checks run in parallel jobs

The CI workflow SHALL run its checks in separate jobs that start at the same time: a lint job (workspace integrity, export checks, config checks, OpenSpec validation, lint and the fallow audit), a tests job (every test target, type checks and coverage artifacts), a build job (build, bundle analysis and mutation testing), a cve job (the CVE gate, defined in its own reusable workflow), a secrets job (the Secret scan over the full history) and a workflows job (the Workflow lint and the Workflow audit).

#### Scenario: Pull request run

- **WHEN** a pull request triggers CI
- **THEN** the lint, tests, build, cve, secrets and workflows jobs start without waiting for each other
- **AND** the lint, tests and build jobs run the affected variant of their targets

#### Scenario: Push run

- **WHEN** a push to `main`, `pre` or `develop` triggers CI
- **THEN** the same six jobs start in parallel
- **AND** the lint, tests and build jobs run their targets for every project

### Requirement: A single main check gates merges

The workflow SHALL end with a job named `main` that depends on every check job and succeeds only when all of them succeed, so the branch-protection ruleset requires one stable check whatever the job layout.

#### Scenario: Every job passes

- **WHEN** the lint, tests, build, cve, secrets and workflows jobs succeed
- **THEN** the `main` job succeeds

#### Scenario: One job fails

- **WHEN** any of the lint, tests, build, cve, secrets or workflows jobs fails or is cancelled
- **THEN** the `main` job fails
- **AND** the pull request cannot be merged under the protected-branch ruleset

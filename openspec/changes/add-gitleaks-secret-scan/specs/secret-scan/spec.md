# Spec Delta

## Purpose

Defines the Secret scan: the check that fails a change when one of its commits adds text matching a credential pattern, where it runs, and how False positives and Revoked secrets are recorded so the scan skips them.

## ADDED Requirements

### Requirement: The scan uses the pinned gitleaks with the repository config

The Secret scan SHALL run gitleaks at the version `mise.toml` pins, with gitleaks' default rules extended by `.gitleaks.toml` and with the fingerprints in `.gitleaksignore` when that file exists. Its output SHALL redact the matched text and name the rule, file, line and commit of each finding.

#### Scenario: Finding output

- **WHEN** the Secret scan finds a match
- **THEN** it prints the rule, file, line and commit of the match
- **AND** the matched text is redacted

#### Scenario: Default rules

- **WHEN** a commit adds a token in a format one of gitleaks' default rules describes
- **THEN** the Secret scan finds it without a rule in `.gitleaks.toml`

### Requirement: Pre-commit blocks staged secrets

The pre-commit hook SHALL run the Secret scan on the staged changes after lint-staged has finished, and SHALL block the commit when it finds a match.

#### Scenario: Staged fake secret

- **WHEN** a developer stages a file that adds a fake credential and commits
- **THEN** the commit is blocked
- **AND** the hook prints the redacted finding

#### Scenario: Fix written by lint-staged

- **WHEN** lint-staged rewrites a staged file
- **THEN** the Secret scan reads the staged content as lint-staged left it

#### Scenario: Clean commit

- **WHEN** the staged changes add no match
- **THEN** the Secret scan passes and the commit proceeds

### Requirement: Pre-push blocks secrets in outgoing commits

The pre-push hook SHALL run the Secret scan on every commit reachable from `HEAD` that no remote-tracking branch contains, including the changes a merge commit makes while resolving conflicts, and SHALL block the push when it finds a match.

#### Scenario: Secret in a pushed commit

- **WHEN** a developer pushes a commit that adds a credential, for example one committed with `--no-verify`
- **THEN** the push is blocked

#### Scenario: Secret added in a merge resolution

- **WHEN** a merge commit adds a credential that neither parent had
- **THEN** the push is blocked

#### Scenario: Commits already on the remote

- **WHEN** every commit reachable from `HEAD` is already on a remote-tracking branch
- **THEN** the Secret scan finds nothing to scan and the push proceeds

### Requirement: The hooks require mise

The pre-commit and pre-push hooks SHALL fail with a single line telling the developer to install mise when mise is missing.

#### Scenario: Commit without mise

- **WHEN** a developer without mise commits
- **THEN** the commit is blocked with a one-line hint to install mise

#### Scenario: Push without mise

- **WHEN** a developer without mise pushes
- **THEN** the push is blocked with a one-line hint to install mise

### Requirement: CI scans the full history on every run

The `secrets` job of the CI workflow SHALL run the Secret scan over the full history of the commit it checks out, on every pull request and on every push to `main`, `pre` and `develop`, and SHALL fail when it finds a match.

#### Scenario: Pull request adds a secret

- **WHEN** a pull request contains a commit that adds a credential
- **THEN** the `secrets` job fails
- **AND** the pull request cannot be merged

#### Scenario: New rule matches an old commit

- **WHEN** a pull request only bumps gitleaks and the new version has a rule that matches a commit already on `develop`
- **THEN** the `secrets` job of that pull request fails

#### Scenario: Clean history

- **WHEN** no commit in the history adds a match beyond the recorded False positives and Revoked secrets
- **THEN** the `secrets` job passes

### Requirement: A False positive is recorded as a rule-scoped pattern

A False positive SHALL be recorded in `.gitleaks.toml` as an allowlist scoped to the rule that matched, with a pattern for the matched text and a description stating why it is not a credential. It SHALL NOT be recorded as a fingerprint.

#### Scenario: Recorded False positive moves

- **WHEN** code containing a recorded False positive moves to another line or file
- **THEN** the Secret scan still skips it

#### Scenario: Real token for the same rule

- **WHEN** a commit adds a real-looking token that the same rule matches and the recorded pattern does not
- **THEN** the Secret scan still finds it

#### Scenario: Finnhub type names

- **WHEN** the Secret scan reads `FinnhubUpstreamError = FinnhubResponseError | NetworkError`
- **THEN** it reports no match

### Requirement: A real credential is revoked and recorded as a Revoked secret

A credential the Secret scan finds in history SHALL be revoked at its provider. It SHALL then be recorded as a Revoked secret in `.gitleaksignore`, as the fingerprint of that one occurrence (commit, file, rule and line) with a comment giving the revocation date. It SHALL NOT be recorded as a False positive, and history SHALL NOT be rewritten.

#### Scenario: Leaked credential

- **WHEN** the Secret scan finds a real credential in a commit already pushed
- **THEN** the credential is revoked
- **AND** its fingerprint is added to `.gitleaksignore` with the revocation date

#### Scenario: Same credential added again

- **WHEN** a new commit adds a credential that is already recorded as a Revoked secret
- **THEN** the Secret scan finds it, because the fingerprint names a different commit

### Requirement: The Secret scan is documented

`README.md` SHALL describe gitleaks under External tools: the command to run the Secret scan by hand, how to record a False positive and a Revoked secret, and that a real credential is revoked.

#### Scenario: Developer meets a finding

- **WHEN** a hook blocks a commit or push with a Secret scan finding
- **THEN** README tells the developer how to tell a False positive from a real credential and how to record each

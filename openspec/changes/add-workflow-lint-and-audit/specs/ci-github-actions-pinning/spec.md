# Spec Delta

## MODIFIED Requirements

### Requirement: All GitHub Actions SHALL be pinned to commit SHA

Every `uses:` reference to a GitHub Action in `.github/workflows/**/*.yml` SHALL use a 40-character commit SHA as its ref, followed by a `# vX.Y.Z` comment with the readable semver version of that commit. The rule applies equally to third-party actions (`nrwl/*`, `pnpm/*`, `codecov/*`, etc.) and to GitHub's official actions (`actions/*`). The Workflow audit SHALL enforce it. A same-repository reference uses the `$/` self-repository syntax and carries no SHA.

#### Scenario: Pinned third-party action passes review

- **WHEN** a workflow contains `uses: nrwl/nx-set-shas@afb73a62d26e41464e9254689e1fd6122ee683c1 # v5.0.1`
- **THEN** the reference is valid and the readable version is documented in the comment

#### Scenario: Pinned official GitHub action passes review

- **WHEN** a workflow contains `uses: actions/checkout@<40-char-sha> # v4.2.2`
- **THEN** the reference is valid; there is no carve-out for `actions/*`

#### Scenario: Mutable tag on any action is rejected

- **WHEN** a workflow contains `uses: codecov/codecov-action@v5` or `uses: actions/checkout@v4` (no SHA)
- **THEN** it is non-compliant and must be converted to a SHA pin with a `# vX.Y.Z` comment
- **AND** the Workflow audit fails on it, in the pre-commit hook and in CI

#### Scenario: Version comment that does not match the SHA

- **WHEN** a workflow pins an action by SHA but its `# vX.Y.Z` comment names a tag that points to a different commit
- **THEN** the Workflow audit fails on it in CI

#### Scenario: Missing version comment

- **WHEN** a workflow pins an action by SHA with no `# vX.Y.Z` comment
- **THEN** the reference is non-compliant, but only review catches it: the Workflow audit's default persona does not report a missing comment

#### Scenario: Same-repository reference

- **WHEN** `ci.yml` calls `uses: $/.github/workflows/cve-scan.yml`
- **THEN** the reference is valid without a SHA, because it resolves to the caller's own commit

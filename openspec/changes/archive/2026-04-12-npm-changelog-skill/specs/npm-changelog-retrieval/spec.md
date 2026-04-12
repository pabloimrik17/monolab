## ADDED Requirements

### Requirement: Argument Parsing

The skill SHALL accept arguments in the following formats:
- `{package} {fromVersion}..{toVersion}` — version range
- `{package} {version}` — single version
- `{package} latest` — latest stable version

The skill SHALL support both unscoped (`react`) and scoped (`@angular/core`) package names.

If no arguments are provided, the skill SHALL prompt the user via AskUserQuestion.

#### Scenario: Range invocation

- **WHEN** user invokes `/experiments:npm-changelog react 18.0.0..19.0.0`
- **THEN** the skill SHALL parse package=`react`, from=`18.0.0`, to=`19.0.0`

#### Scenario: Single version invocation

- **WHEN** user invokes `/experiments:npm-changelog react 19.0.0`
- **THEN** the skill SHALL parse package=`react`, single=`19.0.0`

#### Scenario: Latest invocation

- **WHEN** user invokes `/experiments:npm-changelog @angular/core latest`
- **THEN** the skill SHALL resolve `latest` to the most recent stable version from npm registry

#### Scenario: Missing arguments

- **WHEN** user invokes `/experiments:npm-changelog` with no arguments
- **THEN** the skill SHALL prompt with AskUserQuestion for package name and version range

---

### Requirement: Package Resolution

The skill SHALL resolve an npm package name to its GitHub repository using `npm view {pkg} repository --json`.

The skill SHALL extract `repository.url` to determine `owner/repo` and `repository.directory` to detect monorepo packages.

If `repository.url` does not point to a GitHub host, the skill SHALL report an error and stop.

#### Scenario: Standard package resolution

- **WHEN** resolving `react`
- **THEN** the skill SHALL extract owner=`facebook`, repo=`react` from `repository.url`

#### Scenario: Scoped monorepo package

- **WHEN** resolving `@angular/core`
- **THEN** the skill SHALL extract owner=`angular`, repo=`angular` and detect `directory: "packages/core"` as monorepo indicator

#### Scenario: Non-GitHub repository

- **WHEN** `repository.url` points to a non-GitHub host (e.g., GitLab, Bitbucket)
- **THEN** the skill SHALL output an error: "Only GitHub-hosted packages are supported" and stop

---

### Requirement: Version Enumeration

The skill SHALL enumerate all published versions using `npm view {pkg} versions --json`.

The skill SHALL exclude all prerelease versions (any version with a prerelease tag per semver).

For range queries, the skill SHALL include versions where `from <= version <= to` (both-inclusive, aligning with npm hyphen range semantics).

The skill SHALL sort versions in ascending semver order.

#### Scenario: Range enumeration

- **WHEN** enumerating versions for `react 18.0.0..19.0.0`
- **THEN** the skill SHALL return all stable versions where `18.0.0 <= version <= 19.0.0`, sorted ascending

#### Scenario: Prerelease exclusion

- **WHEN** the version list contains `19.0.0-rc.1`, `19.0.0-canary.1234`
- **THEN** these versions SHALL be excluded from the enumeration

#### Scenario: Single version

- **WHEN** a single version is requested (e.g., `19.0.0`)
- **THEN** the enumeration SHALL contain only that version

---

### Requirement: Strategy A — Raw CHANGELOG.md

The skill SHALL attempt to fetch the raw CHANGELOG file from the GitHub repository as the first retrieval strategy.

The skill SHALL try filenames in order: `CHANGELOG.md`, `CHANGELOG`, `History.md`, `CHANGES.md`.

For repos with known split patterns (Vue-style), the skill SHALL also try `changelogs/CHANGELOG-{major}.{minor}.md`.

For repos with archive files (Angular-style), the skill SHALL also try `CHANGELOG_ARCHIVE.md`.

The skill SHALL resolve `{default_branch}` via `gh api /repos/{owner}/{repo}` → `default_branch` field before Strategy A requests. If resolution fails, the version SHALL proceed to Strategy B with failure context recorded.

The skill SHALL fetch via `curl -sL https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/{filename}`.

The skill SHALL always fetch from the repo root, never from a monorepo subdirectory.

#### Scenario: CHANGELOG.md found

- **WHEN** fetching raw CHANGELOG.md for `react` (facebook/react)
- **THEN** the skill SHALL successfully retrieve the file and proceed to parsing

#### Scenario: Filename fallback

- **WHEN** `CHANGELOG.md` returns 404 but `History.md` exists (e.g., Express)
- **THEN** the skill SHALL use `History.md` as the changelog source

#### Scenario: Vue-style split archives

- **WHEN** `CHANGELOG.md` does not contain entries for the requested version range
- **THEN** the skill SHALL try `changelogs/CHANGELOG-{major}.{minor}.md` for the relevant minor version

#### Scenario: Monorepo root fetch

- **WHEN** resolving a monorepo package like `@angular/core`
- **THEN** the skill SHALL fetch CHANGELOG.md from the repo root, not from `packages/core/`

---

### Requirement: Strategy B — GitHub Releases API

If Strategy A fails or does not cover all requested versions, the skill SHALL fall back to GitHub Releases API.

The skill SHALL use `gh api /repos/{owner}/{repo}/releases/tags/{tag}` to fetch individual releases.

The skill SHALL try tag format `v{version}` first, then `{version}` (without prefix) if 404.

The skill SHALL extract the `body` field as the changelog content. For Strategy B, the fetched release `body` corresponds to the requested tag/version and SHALL be treated as the final version entry directly — no heading-pattern detection or section extraction is required. If `body` is non-empty, the version is considered retrieved.

The skill SHALL rate-limit requests: max 30 per batch with 100ms delay between requests.

#### Scenario: Release found with v prefix

- **WHEN** fetching release for react v19.0.0
- **THEN** `gh api /repos/facebook/react/releases/tags/v19.0.0` SHALL return the release body

#### Scenario: Release found without v prefix

- **WHEN** fetching release for nx 22.5.0 and `v22.5.0` returns 404
- **THEN** the skill SHALL retry with `gh api /repos/nrwl/nx/releases/tags/22.5.0`

#### Scenario: Empty release body

- **WHEN** the release exists but `body` is empty or null
- **THEN** the version SHALL be passed to Strategy C

#### Scenario: Rate limiting

- **WHEN** fetching releases for 40 versions
- **THEN** the skill SHALL batch into groups of 30, with a 100ms delay between each request within and across batches

---

### Requirement: Strategy C — CDN Fallback

If Strategies A and B fail, the skill SHALL attempt to fetch from unpkg CDN.

The skill SHALL fetch via `curl -sL https://unpkg.com/{pkg}@{version}/CHANGELOG.md`.

#### Scenario: CDN has changelog

- **WHEN** fetching `https://unpkg.com/axios@1.7.0/CHANGELOG.md`
- **THEN** the skill SHALL retrieve the file and parse the relevant section

#### Scenario: CDN does not have changelog

- **WHEN** unpkg returns 404
- **THEN** the version SHALL be marked as failed with reason `no_changelog_source`

---

### Requirement: Output Summary

After processing all versions, the skill SHALL output a summary containing:
- Package name and version range
- Count of stable versions in range
- Count already cached (verified)
- Count newly retrieved (verified)
- Count failed (with per-version failure reasons)
- Primary source used (e.g., "CHANGELOG.md", "GitHub Releases")
- Cache directory path
- File listing with sizes and status icons (check for verified, warning for failed)

The skill SHALL NOT output changelog content in the chat.

#### Scenario: Mixed results summary

- **WHEN** 14 versions requested, 8 cached, 5 retrieved, 1 failed
- **THEN** the summary SHALL show all counts, the failed version with its reason, and file paths for all available versions

#### Scenario: All cached

- **WHEN** all requested versions are already cached and verified
- **THEN** the summary SHALL indicate 0 fetched, all from cache, and list file paths

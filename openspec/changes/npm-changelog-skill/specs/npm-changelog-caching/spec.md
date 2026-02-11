## ADDED Requirements

### Requirement: Cache Directory Structure

The skill SHALL store cached changelogs at `~/.claude/changelogs/{normalized-package-name}/`.

Scoped package names SHALL be normalized for directory safety: `@scope/name` becomes `@scope__name` (double underscore replaces `/`).

The cache directory SHALL be created with `mkdir -p` on first use.

#### Scenario: Unscoped package directory

- **WHEN** caching changelogs for `react`
- **THEN** the cache directory SHALL be `~/.claude/changelogs/react/`

#### Scenario: Scoped package directory

- **WHEN** caching changelogs for `@angular/core`
- **THEN** the cache directory SHALL be `~/.claude/changelogs/@angular__core/`

#### Scenario: First-time directory creation

- **WHEN** `~/.claude/changelogs/` does not exist
- **THEN** the skill SHALL create the full directory tree with `mkdir -p`

---

### Requirement: Package Metadata File

The skill SHALL maintain a `_meta.json` file in each package's cache directory containing:
- `package`: original npm package name
- `repository`: GitHub `owner/repo`
- `isMonorepo`: boolean, true if `repository.directory` was present
- `monorepoDirectory`: the `repository.directory` value (or null)
- `tagFormat`: detected tag format (`v{version}` or `{version}`)
- `changelogSource`: primary source that worked (`raw_changelog`, `github_releases`, `cdn`, or null)
- `changelogFiles`: array of filenames found (e.g., `["CHANGELOG.md"]`)
- `lastUpdated`: ISO 8601 timestamp of last metadata update

#### Scenario: Metadata written on first fetch

- **WHEN** fetching changelogs for a package for the first time
- **THEN** `_meta.json` SHALL be created with all fields populated

#### Scenario: Metadata updated on subsequent fetch

- **WHEN** fetching changelogs for a package that already has `_meta.json`
- **THEN** `lastUpdated` SHALL be updated and any newly discovered fields SHALL be merged

---

### Requirement: Raw Source Storage

The skill SHALL store the complete raw CHANGELOG file (when Strategy A succeeds) at `_source/{filename}` within the package's cache directory.

The skill SHALL also store `_source/{filename}.sha256` containing the SHA256 hash of the raw file.

#### Scenario: Raw source saved

- **WHEN** Strategy A successfully fetches `CHANGELOG.md` for `react`
- **THEN** `_source/CHANGELOG.md` SHALL contain the exact 1:1 content from the repo
- **AND** `_source/CHANGELOG.md.sha256` SHALL contain the SHA256 hash

---

### Requirement: Raw Source TTL

The skill SHALL reuse an existing `_source/{filename}` if it was fetched less than 24 hours ago (based on file modification time).

If the file is older than 24 hours, the skill SHALL re-fetch from the remote source.

#### Scenario: Fresh source reused

- **WHEN** `_source/CHANGELOG.md` was fetched 6 hours ago
- **THEN** the skill SHALL reuse the cached file without re-fetching

#### Scenario: Stale source re-fetched

- **WHEN** `_source/CHANGELOG.md` was fetched 30 hours ago
- **THEN** the skill SHALL re-fetch from the remote source and overwrite the cached copy

---

### Requirement: Per-Version File Storage

Each extracted version section SHALL be stored as `{version}.md` in the package's cache directory.

The version filename SHALL use the exact semver string without `v` prefix (e.g., `19.0.0.md`, not `v19.0.0.md`).

#### Scenario: Version file naming

- **WHEN** storing the changelog for react version 19.0.0
- **THEN** the file SHALL be written to `~/.claude/changelogs/react/19.0.0.md`

#### Scenario: Version file content

- **WHEN** a version section is extracted
- **THEN** `{version}.md` SHALL contain the exact extracted section with no modifications

---

### Requirement: Per-Version Metadata File

Each version SHALL have a corresponding `{version}.meta.json` containing:
- `version`: semver string
- `status`: one of `verified`, `failed`
- `source`: retrieval method used (`raw_changelog`, `github_release`, `cdn`)
- `sourceUrl`: exact URL fetched
- `fetchedAt`: ISO 8601 timestamp
- `sha256`: SHA256 hash of the written `.md` file
- `remoteSha256`: SHA256 hash of the content as received from remote
- `byteSize`: file size in bytes
- `failReason`: null if verified, or one of: `no_entry_found`, `empty_release_body`, `no_changelog_source`, `fetch_error`, `write_verification_failed`
- `retryable`: boolean, whether the skill should reattempt on future invocations
- `attempts`: number of fetch attempts made
- `lastAttempt`: ISO 8601 timestamp of last attempt

#### Scenario: Verified version metadata

- **WHEN** a version is successfully fetched and verified
- **THEN** `{version}.meta.json` SHALL have `status: "verified"`, `failReason: null`, matching SHA256 hashes

#### Scenario: Failed version metadata

- **WHEN** a version cannot be found in any source
- **THEN** `{version}.meta.json` SHALL have `status: "failed"`, `failReason: "no_changelog_source"`, `retryable: true`

---

### Requirement: Cache Lookup on Invocation

Before fetching any version from remote sources, the skill SHALL check the local cache.

For each version in the requested range:
- If `{version}.meta.json` exists with `status: "verified"` → skip (already cached)
- If `{version}.meta.json` exists with `status: "failed"` and `retryable: true` → add to fetch list
- If `{version}.meta.json` does not exist → add to fetch list

#### Scenario: Verified version skipped

- **WHEN** `19.0.0.meta.json` exists with `status: "verified"`
- **THEN** the skill SHALL NOT re-fetch version 19.0.0

#### Scenario: Failed retryable version re-fetched

- **WHEN** `18.2.0.meta.json` exists with `status: "failed"` and `retryable: true`
- **THEN** the skill SHALL attempt to re-fetch version 18.2.0

#### Scenario: All versions cached

- **WHEN** every version in the range has `status: "verified"` in cache
- **THEN** the skill SHALL skip all fetching and proceed directly to the output summary

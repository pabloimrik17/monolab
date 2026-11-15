# npm-changelog-retrieval Specification

## Purpose

Multi-strategy changelog retrieval from npm packages, resolving package metadata, enumerating versions, and fetching changelog content via raw GitHub files, GitHub Releases API, and CDN fallback.

## Requirements

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

The skill SHALL fetch via `curl -sL https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/{path}`.

For monorepo packages (`_meta.json.isMonorepo=true` AND `_meta.json.monorepoDirectory` is non-null), the skill SHALL probe the subdirectory path `{monorepoDirectory}/{filename}` for the full filename chain BEFORE falling back to the repo root. Versions not found at the subdirectory SHALL fall through to the root chain; versions still unresolved SHALL proceed to Strategy B.

For single-repo packages (no `monorepoDirectory`), the skill SHALL fetch from the repo root only, preserving prior behavior.

Successfully fetched subdirectory files SHALL be cached under `_source/` using a key that encodes the full path (path separators replaced with `__`), so a subdirectory file does not collide with a root file of the same name.

#### Scenario: CHANGELOG.md found

- **WHEN** fetching raw CHANGELOG.md for `react` (facebook/react, no `repository.directory`)
- **THEN** the skill SHALL successfully retrieve the file from the repo root and proceed to parsing

#### Scenario: Filename fallback

- **WHEN** `CHANGELOG.md` returns 404 but `History.md` exists (e.g., Express)
- **THEN** the skill SHALL use `History.md` as the changelog source

#### Scenario: Vue-style split archives

- **WHEN** `CHANGELOG.md` does not contain entries for the requested version range
- **THEN** the skill SHALL try `changelogs/CHANGELOG-{major}.{minor}.md` for the relevant minor version

#### Scenario: Monorepo root fetch

- **WHEN** resolving a monorepo package that has no `repository.directory`, or whose subdirectory has no CHANGELOG (e.g., `@angular/core`)
- **THEN** the skill SHALL fetch CHANGELOG.md from the repo root

#### Scenario: Monorepo subdirectory fetch

- **WHEN** resolving `@tanstack/query-core` whose `repository.directory` is `packages/query-core`
- **THEN** the skill SHALL first probe `https://raw.githubusercontent.com/TanStack/query/{branch}/packages/query-core/CHANGELOG.md` and use it when the response is 200

#### Scenario: Monorepo fallback to root

- **WHEN** a monorepo's subdirectory CHANGELOG does not contain entries for all requested versions (e.g., older versions consolidated into the root CHANGELOG)
- **THEN** the skill SHALL fall through to the repo-root filename chain for the versions still unresolved before proceeding to Strategy B

#### Scenario: Aggregator-family monorepo

- **WHEN** resolving `@angular/core` whose `repository.directory` is `packages/core` but the project maintains a single root `CHANGELOG.md`
- **THEN** the skill SHALL probe the subdirectory path (which 404s), fall through to the root chain (which 200s), and proceed with the root file

#### Scenario: Subdirectory cache isolation

- **WHEN** a successful subdirectory fetch returns a file named `CHANGELOG.md`
- **THEN** the skill SHALL store it at `_source/packages__query-core__CHANGELOG.md` (or equivalent path-encoded key) so it does not collide with any root `CHANGELOG.md` cache entry

---

### Requirement: Strategy B — GitHub Releases API

If Strategy A fails or does not cover all requested versions, the skill SHALL fall back to GitHub Releases API.

The skill SHALL use `gh api /repos/{owner}/{repo}/releases/tags/{tag}` to fetch individual releases.

On entry, the skill SHALL read `_meta.json.tagFormat`. If set, the skill SHALL attempt that format first. On miss, the skill SHALL fall through to the standard probe chain below without invalidating the cached value.

The skill SHALL probe tag formats in order, stopping at the first success:
1. `v{version}`
2. `{version}` (no prefix)
3. For monorepo packages (`_meta.json.isMonorepo=true`), also probe: `{package}@{version}`, then `{packageBasename}@{version}` when the package is scoped, then `{package}-v{version}`, then `{packageBasename}-v{version}` when the package is scoped.

On first success, the skill SHALL persist the successful format to `_meta.json.tagFormat` as a templated string (e.g., `"v{version}"`, `"{package}@{version}"`, `"{packageBasename}@{version}"`, `"{package}-v{version}"`, `"{packageBasename}-v{version}"`). The skill SHALL update `tagFormat` only when the successful format differs from the currently cached value, to avoid redundant writes.

For unscoped packages, the scope-stripped variants (`{packageBasename}@{version}`, `{packageBasename}-v{version}`) SHALL be skipped because they are identical to the non-stripped variants.

The skill SHALL extract the `body` field as the changelog content. For Strategy B, the fetched release `body` corresponds to the requested tag/version and SHALL be treated as the final version entry directly — no heading-pattern detection or section extraction is required. If `body` is non-empty, the version is considered retrieved.

The skill SHALL rate-limit requests: max 30 per batch with 100ms delay between requests. Each tag-format probe counts as one request against this budget.

#### Scenario: Release found with v prefix

- **WHEN** fetching release for react v19.0.0
- **THEN** `gh api /repos/facebook/react/releases/tags/v19.0.0` SHALL return the release body

#### Scenario: Release found without v prefix

- **WHEN** fetching release for nx 22.5.0 and `v22.5.0` returns 404
- **THEN** the skill SHALL retry with `gh api /repos/nrwl/nx/releases/tags/22.5.0`

#### Scenario: Scoped monorepo release tag

- **WHEN** fetching release for `@tanstack/query-core` version `5.90.20` and both `v5.90.20` and `5.90.20` return 404
- **THEN** the skill SHALL probe `gh api /repos/TanStack/query/releases/tags/@tanstack/query-core@5.90.20` and use its body on 200

#### Scenario: Scope-stripped fallback

- **WHEN** `{package}@{version}` returns 404 for a scoped monorepo package
- **THEN** the skill SHALL probe `{packageBasename}@{version}` (e.g., `query-core@5.90.20`) before moving on to hyphenated variants

#### Scenario: tagFormat cache short-circuit

- **WHEN** `_meta.json.tagFormat` is `"{package}@{version}"` from a prior successful fetch of `@tanstack/query-core@5.90.19`
- **THEN** on a fresh request for `5.90.20`, the skill SHALL probe `@tanstack/query-core@5.90.20` first and SHALL NOT probe `v5.90.20` or `5.90.20` unless the cached-format probe misses

#### Scenario: tagFormat cache fallthrough on miss

- **WHEN** the cached `tagFormat` probe returns 404 (e.g., repo changed tagging convention mid-history)
- **THEN** the skill SHALL silently fall through the standard probe chain and SHALL NOT invalidate the cached `tagFormat`. If a different format succeeds, the skill SHALL update `tagFormat` to the new value.

#### Scenario: tagFormat no-op write skip

- **WHEN** the successful format equals the currently cached `tagFormat`
- **THEN** the skill SHALL NOT rewrite `_meta.json` for this field

#### Scenario: Empty release body

- **WHEN** the release exists but `body` is empty or null
- **THEN** the version SHALL be passed to Strategy C

#### Scenario: Rate limiting

- **WHEN** fetching releases for 40 versions, each potentially probing multiple tag formats
- **THEN** the skill SHALL batch into groups of 30 total requests, with a 100ms delay between each request within and across batches

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

### Requirement: Engine release-note retrieval

In addition to npm-registry package changelogs, the skill SHALL retrieve **engine release notes** for the toolchain engines (`node`, `pnpm`, `npm`, `yarn`, `deno`, `bun`) over a `current → target` version range, keyed by engine name plus version range, and cached using the same caching mechanism as package changelogs. Canonical sources per engine:

- **node** — the Node release record (`https://nodejs.org/dist/index.json` for the version set; release notes from `github.com/nodejs/node` releases / `nodejs.org/en/blog`).
- **pnpm / yarn / npm** — their GitHub Releases / `CHANGELOG`.
- **deno / bun** — their GitHub Releases.

When notes for a requested engine/version cannot be retrieved, the skill SHALL emit the existing `_no changelog available_` sentinel rather than fabricating content. Engine retrieval reuses the existing per-version body + source-link output shape so downstream `## Changelogs` / `## Breaking changes & migration` rendering is unchanged.

#### Scenario: Node release notes retrieved by range

- **WHEN** the skill is asked for `node` notes from `24.12.0 → 26.0.0`
- **THEN** it returns the per-version release notes (with source links) for the stable releases in that range, cached for reuse

#### Scenario: Missing engine notes use the sentinel

- **WHEN** release notes for a requested engine/version are unavailable
- **THEN** the skill emits `_no changelog available_` and does not fabricate content

#### Scenario: Package changelog behavior unchanged

- **WHEN** the skill is asked for an npm package's changelog (not an engine)
- **THEN** it behaves exactly as before (Strategy A/B/C resolution), unaffected by the engine path

## 1. Skill File Scaffold

- [ ] 1.1 Create `claude-plugins/experiments/commands/npm-changelog.md` with YAML frontmatter (`description` field) and top-level structure (title, arguments section, handle missing description section)
- [ ] 1.2 Bump version in `claude-plugins/experiments/.claude-plugin/plugin.json` and `claude-plugins/experiments/package.json` (matching values)

## 2. Argument Parsing Instructions

- [ ] 2.1 Write the argument parsing section: extract `{pkg}`, `{from}..{to}` range, single version, or `latest` from ARGUMENTS
- [ ] 2.2 Write the missing-arguments handler: AskUserQuestion prompt for package name and version

## 3. Package Resolution Instructions

- [ ] 3.1 Write the package resolution section: `npm view {pkg} repository --json` → extract owner/repo, detect monorepo via `repository.directory`
- [ ] 3.2 Write non-GitHub guard: check repository host, output error and stop if not GitHub
- [ ] 3.3 Write version enumeration section: `npm view {pkg} versions --json` → filter prereleases → filter to range → sort ascending

## 4. Cache System Instructions

- [ ] 4.1 Write cache directory setup: `mkdir -p ~/.claude/changelogs/{normalized-pkg}/` with scoped-name normalization (`@scope/name` → `@scope__name`)
- [ ] 4.2 Write `_meta.json` creation/update logic (package, repository, isMonorepo, tagFormat, changelogSource, lastUpdated)
- [ ] 4.3 Write cache lookup logic: for each version check `{ver}.meta.json` → skip verified, retry failed+retryable, add missing to fetch list
- [ ] 4.4 Write raw source TTL check: if `_source/{filename}` exists and <24h old, reuse; otherwise re-fetch

## 5. Strategy A — Raw CHANGELOG.md

- [ ] 5.1 Write Strategy A fetch: `curl -sL` to `raw.githubusercontent.com/{owner}/{repo}/{branch}/{filename}`, trying filenames in order: `CHANGELOG.md`, `CHANGELOG`, `History.md`, `CHANGES.md`
- [ ] 5.2 Write split-archive handling: try `changelogs/CHANGELOG-{major}.{minor}.md` (Vue-style) and `CHANGELOG_ARCHIVE.md` (Angular-style)
- [ ] 5.3 Write raw source storage: save 1:1 to `_source/{filename}` + compute and save `_source/{filename}.sha256`

## 6. Changelog Parsing Instructions

- [ ] 6.1 Write pattern detection logic: scan first 50 lines, test 9 patterns in priority order, select first match
- [ ] 6.2 Write the 9 pattern-specific regexes as a reference table in the skill
- [ ] 6.3 Write section extraction logic: from heading line (inclusive) to line before next heading (exclusive), exact copy
- [ ] 6.4 Write Angular anchor handling (`<a name="...">` inclusion) and setext underline handling (`===` inclusion)
- [ ] 6.5 Write version matching from headings: strip `v` prefix, brackets, URLs, dates to extract semver, match against requested version

## 7. Strategy B — GitHub Releases API

- [ ] 7.1 Write Strategy B fetch: `gh api /repos/{owner}/{repo}/releases/tags/v{ver}`, fallback to `{ver}` without prefix on 404
- [ ] 7.2 Write body extraction: extract `body` field from JSON response, handle empty/null body
- [ ] 7.3 Write rate limiting: max 30 requests per batch, 100ms sleep between requests

## 8. Strategy C — CDN Fallback

- [ ] 8.1 Write Strategy C fetch: `curl -sL https://unpkg.com/{pkg}@{ver}/CHANGELOG.md`, parse section if monolithic file
- [ ] 8.2 Write failure marking for versions where all strategies fail: `status: "failed"`, appropriate `failReason`, `retryable: true`

## 9. Verification Instructions

- [ ] 9.1 Write remote content hashing: `echo -n "{content}" | shasum -a 256` immediately upon receiving content
- [ ] 9.2 Write disk write + read-back verification: write file, read back, compute SHA256, compare against remoteSha256
- [ ] 9.3 Write retry logic on mismatch: up to 2 additional write attempts, mark `write_verification_failed` if all fail
- [ ] 9.4 Write `{ver}.meta.json` creation with all fields (version, status, source, sourceUrl, fetchedAt, sha256, remoteSha256, byteSize, failReason, retryable, attempts, lastAttempt)

## 10. Output Summary Instructions

- [ ] 10.1 Write the summary output template: package name, version range, counts (cached/fetched/failed), primary source, cache path, file listing with sizes and status icons
- [ ] 10.2 Write the all-cached fast path: when every version is verified, skip fetching and show cache-only summary

## 11. Smoke Test

- [ ] 11.1 Test the skill manually with a known package: `/experiments:npm-changelog axios 1.7.0..1.7.9` — verify cache structure, file content, verification hashes
- [ ] 11.2 Test monorepo package: `/experiments:npm-changelog @angular/core 18.0.0..19.0.0` — verify root CHANGELOG fetch, section extraction
- [ ] 11.3 Test releases-only package: `/experiments:npm-changelog nx 20.0.0..20.3.0` — verify Strategy B fallback
- [ ] 11.4 Test cache reuse: re-run a previous query and verify 0 fetches, all from cache

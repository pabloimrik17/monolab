---
description: Retrieve, cache, and verify npm package changelogs locally for a version or range
---

# npm-changelog

Retrieve changelogs for any npm package across a version range. Caches locally at `~/.claude/changelogs/` so repeated queries never re-fetch verified versions. Output is a summary with file paths — never paste changelog content into chat.

## Arguments

**ARGUMENTS variable contains**: `{package} {from}..{to}` (range), `{package} {version}` (single), `{package} latest`, or empty.

### Parsing

1. If ARGUMENTS is empty → go to **Handle Missing Arguments**
2. Split ARGUMENTS on whitespace into tokens
3. First token = `PKG` (the npm package name; may be scoped like `@scope/name`)
    - If the first token starts with `@` and does not contain `/`:
        - If a second token exists, concatenate as `{token1}/{token2}` to form the scoped package name, then treat the next token as `VERSION_PART`
        - If a second token does not exist, treat input as unparseable and go to **Handle Missing Arguments**
4. Remaining token(s) = `VERSION_PART`
    - If `VERSION_PART` is empty → go to **Handle Missing Arguments**
5. Parse `VERSION_PART`:
    - Contains `..` → split on `..` → `FROM_VER` and `TO_VER` (range query). If either is not valid semver, or `FROM_VER > TO_VER` in semver order → output error and go to **Handle Missing Arguments**
    - Equals `latest` → resolve from the filtered stable versions list (after prerelease exclusion in Step 2), pick the max semver as `RESOLVED_VER`, then set `FROM_VER=TO_VER=RESOLVED_VER`
    - Otherwise → treat as single version query and set `FROM_VER=TO_VER=SINGLE_VER`

### Handle Missing Arguments

If ARGUMENTS is empty or could not be parsed, use **AskUserQuestion** to prompt:

> What npm package and version would you like changelogs for?
>
> Examples:
>
> - `react 18.0.0..19.0.0` — version range
> - `axios 1.7.0` — single version
> - `@angular/core latest` — latest stable

Wait for the user's response, then re-parse.

## Step 1: Resolve Package to GitHub Repository

Run:

```bash
npm view {PKG} repository --json
```

Parse the JSON output:

- Resolve repository URL:
    - If output is a plain string, use it directly as `url`
    - If output is an object, read `url` field
    - If neither is present, output error: **"No repository URL found for {PKG}"** and **stop**
- Normalize `url` safely:
    - If SCP-like form (`git@host:owner/repo.git`), convert to `ssh://git@host/owner/repo.git`
    - Otherwise, strip only a leading `git+` prefix if present
    - Parse the normalized URL and verify the hostname is exactly `github.com`. If not, output error: **"Only GitHub-hosted packages are supported. Repository URL: {url}"** and **stop**.
    - Strip trailing `.git` suffix from the path, then extract `{owner}/{repo}` from path segments
- Extract `directory` field (if present) → this indicates a **monorepo** sub-package

Store: `OWNER`, `REPO`, `IS_MONOREPO` (boolean), `MONOREPO_DIR` (string or null).

## Step 2: Enumerate Versions

Run:

```bash
npm view {PKG} versions --json
```

This returns a JSON array of all published version strings.

**Filter:**

1. Exclude all prerelease versions (any version containing `-` after the patch number, e.g., `19.0.0-rc.1`, `19.0.0-canary.1234`)
2. For range queries: include versions where `FROM_VER <= version <= TO_VER` (both-inclusive). Compare using semver ordering, not string comparison.
3. For single version: validate it exists in the versions list, then use `[SINGLE_VER]` as the `VERSIONS` array.
4. For `latest`: take the highest version from the stable-filtered list (do not use `npm view {PKG} version` as it may return a prerelease).
5. Sort the resulting list in ascending semver order.

Store as `VERSIONS` array.

## Step 3: Set Up Cache

### Directory

Normalize the package name for directory safety:

- Scoped packages: `@scope/name` → `@scope__name` (double underscore replaces `/`)
- Unscoped packages: use as-is

```bash
CACHE_DIR="$HOME/.claude/changelogs/{NORMALIZED_PKG}"
mkdir -p "$CACHE_DIR/_source"
```

### Package Metadata (`_meta.json`)

If `$CACHE_DIR/_meta.json` exists, read it. Otherwise create it.

Write/update with:

```json
{
  "package": "{PKG}",
  "repository": "{OWNER}/{REPO}",
  "isMonorepo": {IS_MONOREPO},
  "monorepoDirectory": "{MONOREPO_DIR or null}",
  "tagFormat": null,
  "changelogSource": null,
  "changelogFiles": [],
  "lastUpdated": "{ISO 8601 now}"
}
```

Preserve existing `tagFormat`, `changelogSource`, and `changelogFiles` values if already set — only overwrite with new non-null discoveries. For `changelogFiles`, union new filenames into the existing array.

### Cache Lookup

For each version in `VERSIONS`, check the local cache:

1. If `{ver}.meta.json` exists with `"status": "verified"`:
    - Recompute SHA256 of `{ver}.md`: `shasum -a 256 "$CACHE_DIR/{ver}.md" | cut -d' ' -f1`
    - If hash matches stored `sha256` → **skip** (cached and verified)
    - If file missing or hash mismatch → **add to fetch list**
2. If `{ver}.meta.json` exists with `"status": "failed"` and `"retryable": true` → **add to fetch list**
3. If `{ver}.meta.json` exists with `"status": "failed"` and `"retryable": false` → **skip** (permanently unavailable)
4. If `{ver}.meta.json` does not exist → **add to fetch list**

Store the fetch list as `FETCH_VERSIONS`. If `FETCH_VERSIONS` is empty, skip to **Step 9** (all cached).

### Raw Source TTL

If Strategy A will be used (first attempt), check the raw source cache:

For each known changelog filename in `_meta.json.changelogFiles` (or defaults: `CHANGELOG.md`, `CHANGELOG`, `History.md`, `CHANGES.md` in order):

- If `_source/{filename}` exists:
    - Check file modification time. If **less than 24 hours old**:
        - Recompute SHA256: `shasum -a 256 "$CACHE_DIR/_source/{filename}" | cut -d' ' -f1`
        - Compare against `_source/{filename}.sha256`
        - If match → **reuse** cached raw source (skip re-fetch)
        - If mismatch or `.sha256` missing → **re-fetch**
    - If **older than 24 hours** → **re-fetch**
- If `_source/{filename}` does not exist → **fetch**

## Step 4: Resolve Default Branch

Before Strategy A requests, resolve the repo's default branch:

```bash
gh api /repos/{OWNER}/{REPO} --jq '.default_branch'
```

Store as `DEFAULT_BRANCH`. If this fails, record the error and proceed to Strategy B for all versions (Strategy A requires the branch name).

## Step 5: Strategy A — Raw CHANGELOG File

**Goal:** Fetch the raw CHANGELOG from the GitHub repo and parse individual version sections.

### Fetch

If raw source is not cached (per TTL check), try filenames in order:

1. `CHANGELOG.md`
2. `CHANGELOG`
3. `History.md`
4. `CHANGES.md`

For each filename:

```bash
RAW_TMP="$(mktemp)"
curl -sL --connect-timeout 10 --max-time 30 -w "%{http_code}" -o "$RAW_TMP" "https://raw.githubusercontent.com/{OWNER}/{REPO}/{DEFAULT_BRANCH}/{filename}"
# Clean up after processing: rm -f "$RAW_TMP"
```

Capture both curl exit code and HTTP status:

- If curl exit code != 0 OR HTTP is `000` / `5xx` / non-404 `4xx` → mark Strategy A attempt as `fetch_error` and continue to next strategy (do not finalize version failure yet)
- If HTTP `200` → use this file
- If HTTP `404` → try next filename; if all filenames exhausted → proceed to split-archive check

**Always fetch from repo root**, never from a monorepo subdirectory.

### Split-Archive Handling

If no standard filename worked, or if the fetched CHANGELOG doesn't contain entries for some requested versions:

1. **Vue-style splits:** Try `changelogs/CHANGELOG-{major}.{minor}.md` for each relevant major.minor in the version range
2. **Angular-style archive:** Try `CHANGELOG_ARCHIVE.md`

Fetch each with the same `curl` pattern.

### Store Raw Source

When a raw file is successfully fetched:

1. Save the exact content 1:1 to `$CACHE_DIR/_source/{filename}`
2. Compute SHA256: `shasum -a 256 "$CACHE_DIR/_source/{filename}" | cut -d' ' -f1`
3. Save hash to `$CACHE_DIR/_source/{filename}.sha256`
4. Update `_meta.json`: set `changelogSource` to `"raw_changelog"`, union this successfully fetched `{filename}` into `changelogFiles` (only filenames that returned HTTP 200)

### Parse — Pattern Detection

Scan the first 50 lines of the raw changelog. Test these patterns **in priority order** and use the **first match**:

| Priority | ID                     | Regex                                     | Example                         |
| -------- | ---------------------- | ----------------------------------------- | ------------------------------- |
| 1        | conventional-changelog | `^## \[\d+\.\d+\.\d+.*?\]\(.+?\) \(.+\)$` | `## [3.5.28](url) (2026-02-09)` |
| 2        | standard-h2-date       | `^## \d+\.\d+\.\d+.* \(.+\)$`             | `## 19.2.1 (Dec 3, 2025)`       |
| 3        | standard-h2-v-date     | `^## v\d+\.\d+\.\d+.* \(.+\)$`            | `## v8.0.0 (2026-01-31)`        |
| 4        | h1-date                | `^# \d+\.\d+\.\d+.* \(.+\)$`              | `# 21.2.0 (2026-02-11)`         |
| 5        | h1-bare                | `^# \d+\.\d+\.\d+[^ ]*$`                  | `# 3.8.1`                       |
| 6        | h2-bare                | `^## \d+\.\d+\.\d+[^ ]*$`                 | `## 5.105.1`                    |
| 7        | setext                 | `^\d+\.\d+\.\d+ \/ .+$`                   | `5.2.1 / 2025-12-01`            |
| 8        | eslint-style           | `^v\d+\.\d+\.\d+.* - .+$`                 | `v10.0.0 - February 6, 2026`    |
| 9        | universal-fallback     | `^#{0,2}\s*\[?v?\d+\.\d+\.\d+`            | _(catch-all)_                   |

Only use `universal-fallback` if none of patterns 1–8 matched.

### Parse — Section Extraction

Using the detected pattern's regex, scan the entire file for section boundaries:

1. Each line matching the pattern regex is a **version heading**
2. **Special cases:**
    - **Angular anchors:** If the line immediately before a heading matches `<a name="...">`, include that anchor line as part of the section
    - **Setext underlines:** If the line immediately after a heading matches `^=+$`, include the underline as part of the section
3. A version section = from heading line (inclusive, including any preceding anchor) to the line before the next version heading (exclusive)
4. For the last version in the file: section extends to EOF

### Parse — Version Matching

For each heading, extract the semver version:

1. Strip any `v` prefix
2. Strip brackets `[` `]` and URLs `(...)`
3. Strip date suffixes
4. The result should be a clean `X.Y.Z` semver string

Match against each version in `FETCH_VERSIONS`. For each match found:

- Extract the exact section text (unmodified)
- This content will be written and verified in **Step 7**

Versions in `FETCH_VERSIONS` not found in the parsed file → add to `STRATEGY_B_VERSIONS`.

## Step 6: Strategy B — GitHub Releases API

**Goal:** For versions not covered by Strategy A, fetch from GitHub Releases.

### Rate Limiting

- Max **30 requests per batch**
- **100ms sleep** between each request
- If more than 30 versions remain, batch in groups of 30

### Fetch Releases

For each version in `STRATEGY_B_VERSIONS`, use `--include` to capture the HTTP status line:

```bash
gh api --include /repos/{OWNER}/{REPO}/releases/tags/v{ver}
```

The response contains HTTP headers, then a blank line, then the JSON body. Parse the first line for HTTP status code, then extract the JSON body (everything after the first blank line):

- If HTTP **2xx** and valid JSON body after header separator → success (use `body` field from JSON)
- If HTTP **404** → retry without `v` prefix:

    ```bash
    gh api --include /repos/{OWNER}/{REPO}/releases/tags/{ver}
    ```

- If **other error** (rate limit 403/429, 5xx, network failure) → mark `fetch_error` (retryable)

- On first successful tag format, update `_meta.json.tagFormat` (e.g., `"v{version}"` or `"{version}"`)
- Sleep 100ms between requests:

    ```bash
    sleep 0.1
    ```

### Body Extraction

From the JSON response, extract the `body` field.

- If `body` is non-empty → this is the changelog content for this version. **No further parsing needed** — the release body is the final entry. Proceed to **Step 7** for verification and storage.
- If `body` is empty or null → add version to `STRATEGY_C_VERSIONS` with note `empty_release_body`

## Step 7: Strategy C — CDN Fallback

For each version in `STRATEGY_C_VERSIONS`:

```bash
CDN_TMP="$(mktemp)"
curl -sL --connect-timeout 10 --max-time 30 -w "%{http_code}" -o "$CDN_TMP" "https://unpkg.com/{PKG}@{ver}/CHANGELOG.md"
# Clean up after processing: rm -f "$CDN_TMP"
```

Capture both curl exit code and HTTP status:

- If HTTP `200` → read the content. If monolithic, parse the relevant version section using the same pattern detection and extraction from Step 5.
- If HTTP `404` → mark version as **failed** with `failReason: "no_changelog_source"`
- If curl exit code != 0 OR HTTP `000` / `5xx` / non-404 `4xx` → mark `fetch_error` (retryable)

## Step 8: Verification and Storage

For every piece of changelog content obtained (from any strategy):

### 8a. Compute Remote Hash

Immediately upon receiving content, compute its SHA256:

```bash
printf '%s' "{CONTENT}" | shasum -a 256 | cut -d' ' -f1
```

Store as `REMOTE_SHA256`.

### 8b. Write and Verify

Write the content to `$CACHE_DIR/{ver}.md`.

Then read it back and verify:

```bash
shasum -a 256 "$CACHE_DIR/{ver}.md" | cut -d' ' -f1
```

Compare with `REMOTE_SHA256`:

- **Match** → `status: "verified"`
- **Mismatch** → retry write up to **2 additional times** (3 total). Re-write the original content each time and re-verify.
- If all 3 attempts fail → `status: "failed"`, `failReason: "write_verification_failed"`

### 8c. Write Version Metadata

Create `$CACHE_DIR/{ver}.meta.json`:

```json
{
  "version": "{ver}",
  "status": "verified | failed",
  "source": "raw_changelog | github_releases | cdn | null",
  "sourceUrl": "{exact URL fetched | null}",
  "fetchedAt": "{ISO 8601 now}",
  "sha256": "{hash of written file | null}",
  "remoteSha256": "{hash of received content | null}",
  "byteSize": {file size in bytes | null},
  "failReason": null | "no_entry_found" | "empty_release_body" | "no_changelog_source" | "fetch_error" | "write_verification_failed",
  "retryable": true,
  "attempts": {number of attempts},
  "lastAttempt": "{ISO 8601 now}"
}
```

### Failure Reasons Reference

| Reason                      | When                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `no_entry_found`            | Version has no matching heading in parsed CHANGELOG                                         |
| `empty_release_body`        | GitHub Release exists but body is empty/null                                                |
| `no_changelog_source`       | All strategies (A, B, C) exhausted with only definitive not-found outcomes (404 / no entry) |
| `fetch_error`               | Transient retrieval failure (network, timeout, non-404 HTTP error)                          |
| `write_verification_failed` | SHA256 mismatch after 3 write attempts                                                      |

## Step 9: Output Summary

Display the following (do **NOT** output any changelog content):

```markdown
## npm-changelog: {PKG}

**Range:** {FROM_VER} → {TO_VER} ({TOTAL_STABLE} stable versions)
**Source:** {primary source used}
**Cache:** {CACHE_DIR}

| Version | Status                    | Source          | Size   |
| ------- | ------------------------- | --------------- | ------ |
| {ver}   | ✓ cached                  | raw_changelog   | 2.4 KB |
| {ver}   | ✓ fetched                 | github_releases | 1.1 KB |
| {ver}   | ✗ failed (no_entry_found) | —               | —      |

**Summary:** {cached_count} cached, {fetched_count} fetched, {failed_count} failed
```

### All-Cached Fast Path

When **every** version in the range is already verified in cache (i.e., `FETCH_VERSIONS` was empty):

```markdown
## npm-changelog: {PKG}

**Range:** {FROM_VER} → {TO_VER} ({TOTAL_STABLE} stable versions)
**Cache:** {CACHE_DIR}

All {TOTAL_STABLE} versions already cached and verified. 0 network requests.

| Version | Size   |
| ------- | ------ |
| {ver}   | 2.4 KB |
| ...     | ...    |
```

Skip all fetching steps entirely.

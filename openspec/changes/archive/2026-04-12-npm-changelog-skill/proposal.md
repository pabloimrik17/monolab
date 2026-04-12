## Why

When upgrading npm dependencies or reviewing what changed between versions, changelogs are scattered across GitHub repos in inconsistent formats. Fetching them manually is slow, repetitive, and wastes LLM context on JSON overhead. A skill that retrieves, caches, and verifies changelogs locally eliminates redundant fetches and guarantees 1:1 fidelity with the source repo.

## What Changes

- New `/experiments:npm-changelog` skill in the experiments plugin
- Retrieves changelogs for any npm package in a version range (e.g., `react 18.0.0..19.0.0`)
- Local cache at `~/.claude/changelogs/{pkg}/` — only fetches missing versions
- Three-strategy fallback: raw CHANGELOG.md → GitHub Releases API → unpkg CDN
- Exact parsing of 9+ CHANGELOG heading formats (conventional-changelog, Angular anchors, setext, ESLint-style, etc.)
- SHA256 double verification (remote content vs written-back file)
- Failed versions marked with reason and retryable flag for future attempts
- Monorepo-aware: resolves `repository.url` + `repository.directory` from npm, fetches CHANGELOG from repo root
- Prereleases excluded from version enumeration
- Output: summary of cached/fetched/failed + file paths (no changelog content in chat)

## Capabilities

### New Capabilities

- `npm-changelog-retrieval`: Resolving npm packages to GitHub repos, fetching changelogs via prioritized strategy chain (raw CHANGELOG.md → GH Releases → CDN), version range enumeration excluding prereleases
- `npm-changelog-parsing`: Detecting and parsing 9+ CHANGELOG heading formats with pattern-specific regexes, extracting exact version sections from monolithic files
- `npm-changelog-caching`: Local file cache at `~/.claude/changelogs/`, per-version storage with metadata, 24h TTL for raw source files, skip-if-verified logic
- `npm-changelog-verification`: SHA256 double-hash integrity (remote vs readback), failure marking with reasons (`no_entry_found`, `empty_release_body`, `no_changelog_source`, `fetch_error`, `write_verification_failed`), retryable flag

### Modified Capabilities

- `experiments-plugin`: Adding `commands/npm-changelog.md` skill file to the plugin, bumping version

## Impact

- **New files**: `claude-plugins/experiments/commands/npm-changelog.md`
- **Modified files**: `claude-plugins/experiments/.claude-plugin/plugin.json` (version bump), `claude-plugins/experiments/package.json` (version bump)
- **Runtime deps**: `gh` CLI (for GitHub API auth), `npm` CLI (for version listing), `shasum`/`sha256sum` (for verification)
- **Filesystem**: Creates `~/.claude/changelogs/` directory tree on first use
- **Network**: GitHub API (raw content + releases), npm registry, optionally unpkg CDN

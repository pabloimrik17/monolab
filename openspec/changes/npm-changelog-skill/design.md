## Context

The skill lives as a single markdown file (`commands/npm-changelog.md`) in the experiments plugin. It instructs Claude to orchestrate shell commands (`npm`, `gh`, `shasum`) and file I/O to retrieve, cache, and verify changelogs. No compiled code — same pattern as the existing `ralph.md` skill.

Changelogs exist in wildly different formats across the npm ecosystem. Our exploration of 10 major packages revealed 9 distinct heading patterns, 2 archive strategies, and 1 package (Nx) with no CHANGELOG file at all. All major monorepos keep a single root CHANGELOG (never per-package).

## Goals / Non-Goals

**Goals:**
- Retrieve changelog content 1:1 with what's in the source repo
- Cache locally so repeated queries never re-fetch verified versions
- Handle all major CHANGELOG formats with exact parsing (no lossy transformations)
- Gracefully degrade through fallback strategies when primary source unavailable
- Mark failures clearly with reasons so future invocations can retry

**Non-Goals:**
- Generating or summarizing changelogs (we retrieve, never create)
- Supporting private/authenticated npm registries
- Filtering monorepo changelogs to a single package's entries (we store the full version section)
- Supporting prerelease versions
- Displaying changelog content in the chat (output is summary + file paths)

## Decisions

### D1: Skill file, not a TypeScript package

**Choice:** Single `commands/npm-changelog.md` markdown file.

**Why over a compiled package:** The experiments plugin has no build step. Both existing skills (`hello-experiments`, `ralph`) are pure markdown. Claude interprets the instructions and orchestrates shell commands. This is consistent, zero-build, and easily iterable.

**Alternative considered:** An Nx library with TypeScript. Rejected — overkill for a skill that orchestrates CLI tools, and would require adding build infrastructure to the experiments plugin.

### D2: Three-strategy fallback chain

```
Strategy A: Raw CHANGELOG.md from GitHub
  ↓ (404 or not found)
Strategy B: GitHub Releases API per tag
  ↓ (404 or empty body)
Strategy C: unpkg CDN
  ↓ (404)
Mark as failed
```

**Why this order:**
- **A (raw file)** is the most token-efficient (0% overhead, pure markdown) and gives us all versions in one fetch. Covers ~60% of packages.
- **B (releases API)** via `gh api` has auth built-in (5000 req/hr). Covers packages with no CHANGELOG file (Nx, etc.). ~10% overhead from JSON wrapper.
- **C (unpkg)** is a long-shot fallback (~15% of packages include CHANGELOG in tarball) but costs nothing to try.

**Alternative considered:** GitHub GraphQL API as primary. Rejected — requires explicit token management and the 0-overhead raw file is simpler.

### D3: Pattern detection then specific regex for parsing

**Choice:** Two-phase parser: detect the heading pattern from first 50 lines, then use that pattern's specific regex for all section extraction.

**Supported patterns (in detection order):**

| ID | Pattern | Example | Regex |
|---|---|---|---|
| 1 | conventional-changelog | `## [3.5.28](url) (2026-02-09)` | `^## \[\d+\.\d+\.\d+.*?\]\(.+?\) \(.+\)$` |
| 2 | standard-h2-date | `## 19.2.1 (Dec 3, 2025)` | `^## \d+\.\d+\.\d+.* \(.+\)$` |
| 3 | standard-h2-v-date | `## v8.0.0 (2026-01-31)` | `^## v\d+\.\d+\.\d+.* \(.+\)$` |
| 4 | h1-date | `# 21.2.0 (2026-02-11)` | `^# \d+\.\d+\.\d+.* \(.+\)$` |
| 5 | h1-bare | `# 3.8.1` | `^# \d+\.\d+\.\d+[^ ]*$` |
| 6 | h2-bare | `## 5.105.1` | `^## \d+\.\d+\.\d+[^ ]*$` |
| 7 | setext | `5.2.1 / 2025-12-01\n===` | `^\d+\.\d+\.\d+ \/ .+$` |
| 8 | eslint-style | `v10.0.0 - February 6, 2026` | `^v\d+\.\d+\.\d+.* - .+$` |
| 9 | universal-fallback | (catch-all) | `^#{0,2}\s*\[?v?\d+\.\d+\.\d+` |

**Why specific regexes over universal only:** The universal catch-all can false-match sub-headings or inline text. Detecting the pattern first and using its tight regex avoids misparses.

**Section boundary rule:** A version section starts at its heading line (inclusive of any preceding `<a name="...">` anchor for Angular) and ends at the line before the next version heading. For setext style, the `===` underline is included in the section.

### D4: Cache structure with raw source + per-version extracts

```
~/.claude/changelogs/{pkg}/
├── _meta.json                    # package metadata, repo URL, tag format
├── _source/
│   ├── CHANGELOG.md              # 1:1 copy from repo (source of truth)
│   └── CHANGELOG.md.sha256       # hash of the raw source
├── v19.0.0.md                    # exact section extract
├── v19.0.0.meta.json             # status, hashes, source method, timestamp
└── ...
```

**Why both raw and extracts:** The raw file is the source of truth for verification. The per-version extracts are for fast consumption. Re-parsing from raw can regenerate any extract if needed.

**Package name normalization for directories:** Scoped packages use directory-safe names: `@angular/core` → `@angular__core` (double underscore replaces `/`).

**24h TTL on raw source:** If `_source/CHANGELOG.md` exists and was fetched <24h ago, reuse it. Otherwise re-fetch.

### D5: SHA256 double verification

1. Fetch content → compute `remoteSha256`
2. Write to disk → read back → compute `localSha256`
3. Match? → `status: "verified"`. Mismatch? → retry write (max 2 attempts), then `status: "failed"`

**Tool:** `shasum -a 256` (available on macOS by default).

**Why read-back verification:** Catches disk write corruption, encoding issues, or truncation. The cost is one extra read per file — negligible for files typically <100KB.

### D6: Version enumeration via npm CLI

**Choice:** `npm view {pkg} versions --json` piped through semver filtering.

**Why:** Returns only version strings (~98KB for react vs 6.5MB full metadata). Filtering prereleases and range done with `semver` logic in the skill instructions (Claude applies the filter).

### D7: Rate limiting for GitHub Releases

**Choice:** Max 30 requests per batch, 100ms delay between requests.

**Why 30:** A large version range (e.g., 50 stable versions) is realistic. At 100ms spacing, 30 requests take 3 seconds — acceptable. Stays well under 5000/hr authenticated limit. If more than 30 versions need releases, batch in groups of 30.

### D8: Monorepo handling

1. `npm view {pkg} repository --json` → extract `url` (owner/repo) + `directory` (monorepo indicator)
2. If `directory` field present → monorepo sub-package
3. Always fetch CHANGELOG from repo root (never from package subdirectory)
4. Store full version section including all modules' entries

**No per-package filtering:** All major monorepos (Angular, Babel, React, Vue) group changes by module within each version section. We preserve the full section 1:1.

## Risks / Trade-offs

**[Large CHANGELOGs]** → Files like ESLint's (1MB+) are expensive to download. Mitigation: cached after first fetch with 24h TTL. Raw source download is one-time cost per package.

**[Heading format not recognized]** → A package could use a format not in our 9 patterns. Mitigation: universal fallback regex (pattern 9) catches most semver-like headings. If even that fails, the version is marked `failed` with `no_entry_found`.

**[CHANGELOG changes between tags]** → The raw CHANGELOG from HEAD may differ from what existed at a specific tag. Mitigation: acceptable trade-off — fetching per-tag CHANGELOGs would require N downloads instead of 1. For exact historical accuracy, Strategy B (releases) serves as fallback.

**[gh CLI not installed/authenticated]** → Strategy B fails entirely. Mitigation: Strategy A (raw file) doesn't require auth. Strategy C (unpkg) doesn't either. Only packages with no CHANGELOG file (like Nx) would be affected. The skill should detect this and warn.

**[Rate limit exhaustion]** → 60 req/hr unauthenticated is tight. Mitigation: skill uses `gh api` which inherits auth (5000/hr). Raw file fetches via `curl` don't count against REST API limits when hitting raw.githubusercontent.com.

**[Cache directory permissions]** → `~/.claude/` may not exist. Mitigation: skill creates `~/.claude/changelogs/` with `mkdir -p` on first run.

## Open Questions

None — all decisions resolved during exploration.

# npm-changelog-parsing Specification

## Purpose

CHANGELOG file format detection and version section extraction, supporting multiple heading conventions used across the npm ecosystem.

## Requirements

### Requirement: Pattern Detection

The skill SHALL detect the CHANGELOG heading format by scanning the first 50 lines of the file.

The skill SHALL test patterns in the following priority order and use the first match:

| Priority | ID | Pattern | Example |
|---|---|---|---|
| 1 | conventional-changelog | `## [ver](url) (date)` | `## [3.5.28](https://...) (2026-02-09)` |
| 2 | standard-h2-date | `## ver (date)` | `## 19.2.1 (Dec 3, 2025)` |
| 3 | standard-h2-v-date | `## vVer (date)` | `## v8.0.0 (2026-01-31)` |
| 4 | h1-date | `# ver (date)` | `# 21.2.0 (2026-02-11)` |
| 5 | h1-bare | `# ver` | `# 3.8.1` |
| 6 | h2-bare | `## ver` | `## 5.105.1` |
| 7 | setext | `ver / date\n===` | `5.2.1 / 2025-12-01` |
| 8 | eslint-style | `vVer - date` | `v10.0.0 - February 6, 2026` |
| 9 | universal-fallback | catch-all semver heading | any `#{0,2} [v]X.Y.Z` pattern |

#### Scenario: Conventional-changelog detection

- **WHEN** the first 50 lines contain `## [3.5.28](https://github.com/vuejs/core/compare/v3.5.27...v3.5.28) (2026-02-09)`
- **THEN** the skill SHALL detect pattern `conventional-changelog`

#### Scenario: Setext detection

- **WHEN** the first 50 lines contain `5.2.1 / 2025-12-01` followed by `=====`
- **THEN** the skill SHALL detect pattern `setext`

#### Scenario: No pattern matched

- **WHEN** no pattern matches in the first 50 lines
- **THEN** the skill SHALL use `universal-fallback` as the detection result

---

### Requirement: Pattern-Specific Regexes

Each detected pattern SHALL use its own specific regex for section extraction:

| Pattern | Regex |
|---|---|
| conventional-changelog | `^## \[\d+\.\d+\.\d+.*?\]\(.+?\) \(.+\)$` |
| standard-h2-date | `^## \d+\.\d+\.\d+.* \(.+\)$` |
| standard-h2-v-date | `^## v\d+\.\d+\.\d+.* \(.+\)$` |
| h1-date | `^# \d+\.\d+\.\d+.* \(.+\)$` |
| h1-bare | `^# \d+\.\d+\.\d+[^ ]*$` |
| h2-bare | `^## \d+\.\d+\.\d+[^ ]*$` |
| setext | `^\d+\.\d+\.\d+ \/ .+$` |
| eslint-style | `^v\d+\.\d+\.\d+.* - .+$` |
| universal-fallback | `^#{0,2}\s*\[?v?\d+\.\d+\.\d+` |

The skill SHALL NOT use the universal-fallback regex unless pattern detection explicitly fell through to it.

#### Scenario: Correct regex applied

- **WHEN** pattern `h2-bare` is detected (e.g., Webpack)
- **THEN** the skill SHALL use `^## \d+\.\d+\.\d+[^ ]*$` for all section boundary detection in that file

#### Scenario: Fallback avoids false matches

- **WHEN** a CHANGELOG contains `### Bug Fixes for 3.5.28` as a sub-heading
- **THEN** the specific regex for `conventional-changelog` SHALL NOT match this line as a version boundary

---

### Requirement: Section Extraction

The skill SHALL extract a version section as all content from the version heading line (inclusive) to the line before the next version heading (exclusive).

The extracted section SHALL be an exact, unmodified copy of the original text — no trimming, reformatting, or transformation.

#### Scenario: Standard section extraction

- **WHEN** extracting version 19.0.0 from a file where `## 19.0.0 (...)` is at line 5 and `## 18.3.1 (...)` is at line 42
- **THEN** the section SHALL contain lines 5 through 41 (inclusive), exactly as they appear in the file

#### Scenario: First version in file

- **WHEN** the requested version is the first entry in the CHANGELOG
- **THEN** the section SHALL start at its heading and end at the line before the second version heading

#### Scenario: Last version in file

- **WHEN** the requested version is the last entry in the CHANGELOG
- **THEN** the section SHALL start at its heading and continue to the end of the file

---

### Requirement: Angular Anchor Handling

For CHANGELOGs with Angular-style `<a name="...">` anchors preceding version headings, the skill SHALL include the anchor line as part of the version section.

#### Scenario: Anchor inclusion

- **WHEN** extracting a version whose heading is preceded by `<a name="21.2.0"></a>`
- **THEN** the extracted section SHALL include the `<a name>` line followed by the `# 21.2.0 (...)` heading and all content until the next version

---

### Requirement: Setext Heading Handling

For CHANGELOGs using setext-style headings (text followed by `===` underline), the skill SHALL include both the heading text line and the underline as part of the section.

#### Scenario: Setext section boundaries

- **WHEN** extracting version 5.2.1 formatted as `5.2.1 / 2025-12-01\n====================`
- **THEN** the extracted section SHALL start with the version text line, include the `===` underline, and continue until the next version's text line

---

### Requirement: Version Matching in Headings

The skill SHALL extract the semver version number from each heading line and match it against the requested version, ignoring any `v` prefix, brackets, URLs, or date suffixes.

#### Scenario: Bracketed version matching

- **WHEN** heading is `## [3.5.28](https://...)  (2026-02-09)` and version `3.5.28` is requested
- **THEN** the skill SHALL match this heading to version `3.5.28`

#### Scenario: v-prefixed version matching

- **WHEN** heading is `## v8.0.0 (2026-01-31)` and version `8.0.0` is requested
- **THEN** the skill SHALL match this heading to version `8.0.0`

---

### Requirement: Version Not Found in File

When a requested version has no matching heading in the parsed CHANGELOG, the skill SHALL report that version as not found in the file, allowing the retrieval layer to fall back to the next strategy.

#### Scenario: Version absent from CHANGELOG

- **WHEN** version `18.2.1` is requested but no heading matches `18.2.1` in the file
- **THEN** the skill SHALL add `18.2.1` to the list of versions needing fallback retrieval

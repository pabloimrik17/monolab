---
description: List all projects registered in the user-scoped Commander registry at <HOME>/.claude/commander/projects.json
---

# commander-list

Print every project registered in the user-scoped Commander registry as a vertically-aligned YAML-ish block, with inline drift annotations for legacy v1 records (missing `repoType`) and for records whose `path` no longer exists on disk.

Strictly read-only. Never creates, modifies, or deletes any file under `<HOME>/.claude/commander/`.

---

## Registry contract (read-only excerpt)

This command implements the read side of the contract documented in full in [`add.md`](./add.md). The relevant invariants are repeated here so this file is self-contained — no shared sidecar yet (extraction is deferred until a third commander consumer exists).

### Path

`<HOME>/.claude/commander/projects.json` — `<HOME>` resolves to `$HOME` on POSIX and `%USERPROFILE%` on Windows.

### Lazy create — read MUST NOT touch disk

A missing file MUST be treated as an empty registry. Reads MUST NOT create the directory or the file. The on-disk state is byte-identical before and after this command runs (verifiable via `shasum`).

### Schema

```json
{
    "version": 2,
    "projects": {
        "<name>": {
            "name": "...",
            "path": "...",
            "keywords": ["..."],
            "description": "...",
            "createdAt": "<ISO-8601 UTC>",
            "updatedAt": "<ISO-8601 UTC>",
            "repoType": "single-repo | monorepo | multi-monorepo",
            "specialRules": ["..."],
            "monorepoRoot": "..."
        }
    }
}
```

`repoType`, `specialRules`, and `monorepoRoot` MAY be absent on legacy v1 records. The remaining fields are always present in v2.

### Version gate

- `version <= 2` → read normally.
- `version > 2` → abort with `unsupported registry version: <n>` and exit non-zero. Do NOT render any blocks. Do NOT touch the file.

### Drift signals (surfaced by this command)

- **Legacy v1**: `record.repoType` is absent or empty. Suffix `[legacy: missing repoType]`.
- **Missing path**: `Bash test -d "<record.path>"` exits non-zero. Suffix `[missing path]` and append `(NOT FOUND)` to the rendered `path:` value.

Drift never alters the registry and never changes the exit code.

---

## Invocation

```text
/commander:list
```

The command takes no flags or arguments in v1.

## Step 1 — Argument handling

1. Trim leading/trailing whitespace from `ARGUMENTS`.
2. If the trimmed string is empty: proceed silently to Step 2.
3. If non-empty: print exactly one line — `/commander:list takes no arguments; ignoring: <verbatim trimmed argument string>` — then continue with Step 2 normally. Do NOT exit early. The exit code is whatever Step 2–5 produce (zero on normal render, non-zero on `unsupported registry version`).

## Step 2 — Read the registry

1. Resolve `REGISTRY_PATH` = `<HOME>/.claude/commander/projects.json`. Use `$HOME` on POSIX, `%USERPROFILE%` on Windows.
2. Probe with `Bash test -f "<REGISTRY_PATH>"`.
    - If missing: skip to Step 5 (empty render). Do NOT create the directory or the file.
3. `Read` the file.
4. JSON-parse the contents.
    - On parse failure: print `registry file is not valid JSON`, exit non-zero, do NOT render any blocks. (Mirrors the `/commander:add` reader contract.)
5. Inspect `version`:
    - If `version > 2`: print `unsupported registry version: <n>` (where `<n>` is the literal value), exit non-zero, do NOT render any blocks.
6. Inspect `projects`:
    - If absent, `null`, or an empty object: skip to Step 5 (empty render).
7. Otherwise: proceed to Step 3.

## Step 3 — Detect drift per record

Iterate `projects` in JSON insertion order (the same order the `commander-registry` `list()` contract guarantees — do NOT resort). For each record compute two boolean flags:

- `legacyMissingRepoType` ← `record.repoType` is absent OR an empty string.
- `missingPath` ← `Bash test -d "<record.path>"` exits non-zero. Spawn one shell per record. Quote the path to handle spaces.

Drift detection is purely informational. The exit code stays `0` no matter how many drift suffixes are emitted.

## Step 4 — Render — non-empty registry

For each record (insertion order), emit the lines below.

### 4.1 Project-name line

```text
<name>[ <suffix1>][ <suffix2>]
```

- Always print `<name>` at column 0.
- If `legacyMissingRepoType`: append `[legacy: missing repoType]` (single leading space).
- If `missingPath`: append `[missing path]` (single leading space, AFTER the legacy suffix when both apply).
- The fixed order is **legacy first, missing-path second**. Multiple drift suffixes stack on the same line.

### 4.2 Field lines — alignment

Two-space indent. Each label string `"  <label>:"` is right-padded with spaces to **exactly 17 characters total** before the value starts (i.e., the value column begins at byte offset 17 of the line). Reference paddings:

| Label string    | Length | Trailing spaces |
| --------------- | ------ | --------------- |
| `path:`         | 7      | 10              |
| `monorepoRoot:` | 15     | 2               |
| `repoType:`     | 11     | 6               |
| `keywords:`     | 11     | 6               |
| `description:`  | 14     | 3               |
| `specialRules:` | 15     | 2               |
| `registered:`   | 13     | 4               |

### 4.3 Field lines — order and rules

Render in this exact order, omitting any line whose source field is absent or empty:

1. **`path`** — always present.
    - If `missingPath`, append `(NOT FOUND)` (two spaces before the parenthesized phrase) to the value.
2. **`monorepoRoot`** — print only when present and non-empty.
3. **`repoType`** — print only when present and non-empty. Legacy v1 records SKIP this line entirely.
4. **`keywords`** — join the array with `,` (comma + single space). Never empty for v2 records.
5. **`description`** — single line, verbatim. Do not wrap or truncate.
6. **`specialRules`** — only when present and non-empty:
    - First line: the padded label `specialRules:` followed by NOTHING (no value on the header line; the trailing 2 spaces of padding are preserved verbatim — they are part of the alignment grid, not significant content).
    - Then one line per rule, indented **four spaces** then `- <rule>` verbatim.
7. **`registered`**:
    - Compute `createdDate` = first 10 characters of `createdAt` (`YYYY-MM-DD`).
    - Compute `updatedDate` = first 10 characters of `updatedAt`.
    - If `updatedAt > createdAt` (lexicographic compare on the full ISO-8601 strings): value is `<createdDate>  (updated <updatedDate>)` (two spaces between the date and the parenthesized suffix).
    - Otherwise: value is `<createdDate>` only.

### 4.4 Block separation

Separate consecutive project blocks with **exactly one blank line**. After the last block, print one blank line, then the summary line (Step 4.5).

### 4.5 Summary line

```text
<N> project(s) registered.
```

- `<N>` is the count of rendered records.
- Plural agreement: `1 project registered.` when `N == 1`; `<N> projects registered.` otherwise.

Exit `0`.

## Step 5 — Render — empty registry

Print exactly:

```text
No projects registered. Use /commander:add to register one.
```

Exit `0`. No count line, no decoration.

---

## Worked example

Given (excerpt):

```json
{
    "version": 2,
    "projects": {
        "investlab": {
            "name": "investlab",
            "path": "/Users/etherless/WebstormProjects/monolab/apps/investlab",
            "keywords": ["react", "solid-start", "typescript"],
            "description": "Portfolio tracker, SolidStart-based, lives inside monolab monorepo.",
            "createdAt": "2026-04-19T12:00:00Z",
            "updatedAt": "2026-04-22T08:30:00Z",
            "specialRules": ["No ESLint", "Tests required for all mutations"],
            "monorepoRoot": "/Users/etherless/WebstormProjects/monolab"
        },
        "qup": {
            "name": "qup",
            "path": "/Users/etherless/WebstormProjects/qup",
            "keywords": ["expo", "react-native", "typescript"],
            "description": "Expo mobile app for habit tracking.",
            "createdAt": "2026-04-20T10:00:00Z",
            "updatedAt": "2026-04-20T10:00:00Z",
            "repoType": "single-repo"
        }
    }
}
```

Output (`investlab` path missing on disk, `qup` path present):

```text
investlab [legacy: missing repoType] [missing path]
  path:          /Users/etherless/WebstormProjects/monolab/apps/investlab  (NOT FOUND)
  monorepoRoot:  /Users/etherless/WebstormProjects/monolab
  keywords:      react, solid-start, typescript
  description:   Portfolio tracker, SolidStart-based, lives inside monolab monorepo.
  specialRules:
    - No ESLint
    - Tests required for all mutations
  registered:    2026-04-19  (updated 2026-04-22)

qup
  path:          /Users/etherless/WebstormProjects/qup
  repoType:      single-repo
  keywords:      expo, react-native, typescript
  description:   Expo mobile app for habit tracking.
  registered:    2026-04-20

2 projects registered.
```

---

## Error messages

- `registry file is not valid JSON` — `Read` succeeded but JSON parse failed. Exit non-zero. Mirrors the reader contract.
- `unsupported registry version: <n>` — `version > 2`. Exit non-zero. The on-disk file is left untouched.
- `/commander:list takes no arguments; ignoring: <verbatim>` — soft notice on extra arguments. Continues to render normally.

## Exit codes

- `0` — successful render (empty or non-empty), even when drift suffixes are emitted.
- non-zero — invalid JSON or `unsupported registry version`.

## Non-goals (deferred)

- Filtering, sorting, or `--format json` flags. Add when a real caller asks.
- Auto-migration of legacy v1 records (handled by future `commander-update`).
- Validating `monorepoRoot` existence (only `path` drift is surfaced in v1).
- Validating `keywords` against the canonical vocabulary in `commander-normalize` (out of scope for a list).
- Stale `updatedAt` warnings (no clear definition of stale).

## 1. Command file scaffold

- [x] 1.1 Create `claude-plugins/experiments/commands/commander-list.md` with YAML frontmatter (`description: List all projects registered in the user-scoped Commander registry at <HOME>/.claude/commander/projects.json`).
- [x] 1.2 Add the "Invocation" section documenting `/experiments:commander-list` with no flags.
- [x] 1.3 Embed the registry-read snippet (lazy-create-aware, version check, JSON parse) using built-in tools only (`Read`, `Bash`). Mirror the contract documented in `commander-add.md` — do not extract a shared sidecar yet.

## 2. Argument handling

- [x] 2.1 Trim `ARGUMENTS`. If empty, proceed silently.
- [x] 2.2 If non-empty, print `commander-list takes no arguments; ignoring: <verbatim>` once, then continue rendering.

## 3. Read & version gate

- [x] 3.1 Resolve `<HOME>/.claude/commander/projects.json`.
- [x] 3.2 If the file is missing, jump to step 5 (empty render).
- [x] 3.3 `Read` the file and JSON-parse it. On parse failure, print `registry file is not valid JSON` and exit non-zero (mirrors `commander-add` error contract).
- [x] 3.4 If `version > 2`, print `unsupported registry version: <n>` and exit non-zero. Do not render any blocks.
- [x] 3.5 If `projects` is absent or empty, jump to step 5.

## 4. Render — non-empty registry

- [x] 4.1 Iterate `projects` in JSON insertion order.
- [x] 4.2 For each record, compute drift flags:
    - `legacyMissingRepoType`: `repoType` absent OR empty string.
    - `missingPath`: `Bash test -d "<path>"` exits non-zero.
- [x] 4.3 Compose the project-name line: `<name>` followed by space-separated drift suffixes in fixed order (legacy first, then missing-path).
- [x] 4.4 Render the `path:` line. If `missingPath`, append ` (NOT FOUND)` to the value.
- [x] 4.5 Render `monorepoRoot:` only when present and non-empty.
- [x] 4.6 Render `repoType:` only when present and non-empty (legacy v1 records skip this line).
- [x] 4.7 Render `keywords:` joined by `, `.
- [x] 4.8 Render `description:` as a single line.
- [x] 4.9 Render `specialRules:` block only when present and non-empty: header line + one `    - <rule>` line per entry.
- [x] 4.10 Render `registered:` collapsing `createdAt` / `updatedAt` (date-only, `YYYY-MM-DD`); add `(updated <date>)` only when `updatedAt > createdAt`.
- [x] 4.11 Apply 17-character colon alignment on all field labels (label + colon padded to 17 chars).
- [x] 4.12 Separate blocks with exactly one blank line.
- [x] 4.13 After the last block, print one blank line then `<N> project(s) registered.` with correct singular/plural.

## 5. Render — empty registry

- [x] 5.1 Print exactly: `No projects registered. Use /experiments:commander-add to register one.`
- [x] 5.2 Exit zero.

## 6. Marketplace + plugin metadata

- [x] 6.1 Add `commander-list.md` to the experiments plugin command listing in `claude-plugins/experiments/README.md`.
- [x] 6.2 Bump the version in `claude-plugins/experiments/.claude-plugin/plugin.json` (patch).
- [x] 6.3 Bump the version in `claude-plugins/experiments/package.json` to match.
- [x] 6.4 Bump the `experiments` entry version in `.claude-plugin/marketplace.json` to match.
- [x] 6.5 Confirm all three files declare the same version string (manual diff).

## 7. Manual verification

- [x] 7.1 Run `/experiments:commander-list` with NO `<HOME>/.claude/commander/projects.json` file → expect empty-registry message; confirm no directory or file was created.
- [x] 7.2 Run with an empty registry (`{"version": 2, "projects": {}}`) → expect the same empty-registry message.
- [x] 7.3 Register two projects via `/experiments:commander-add`, then run `/experiments:commander-list` → expect two blocks in insertion order, full alignment, correct count line.
- [x] 7.4 Hand-edit one record to remove `repoType` (simulating v1 legacy) → expect `[legacy: missing repoType]` suffix and the `repoType:` line omitted from that block.
- [x] 7.5 Hand-edit one record's `path` to a non-existent directory → expect `[missing path]` suffix and ` (NOT FOUND)` appended to the `path:` value.
- [x] 7.6 Combine the two drift conditions on a single record → expect both suffixes in the order `[legacy: missing repoType] [missing path]`.
- [x] 7.7 Hand-edit the registry file to `version: 3` → expect `unsupported registry version: 3`, non-zero exit, and zero blocks rendered.
- [x] 7.8 Run `/experiments:commander-list --foo bar` → expect the "ignoring" notice followed by normal render.
- [x] 7.9 After every step above, confirm `<HOME>/.claude/commander/projects.json` is byte-identical to its pre-run state (use `shasum` before/after).

## 8. Validation & wrap-up

- [x] 8.1 Run `openspec validate add-commander-list-command` → expect "is valid".
- [x] 8.2 Run `openspec verify --change add-commander-list-command` (or the equivalent `/opsx:verify`) once implementation is complete.

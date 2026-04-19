# Implementation Tasks

## 1. Scaffolding

- [x] 1.1 Create `claude-plugins/experiments/commands/commander-add.md` skeleton with YAML frontmatter (`description`)
- [x] 1.2 Verify the command is discovered by Claude Code (`/experiments:commander-add` appears in slash-command list)

## 2. Registry Contract (inside the command file)

- [x] 2.1 Document registry path constant: `~/.claude/commander/projects.json`
- [x] 2.2 Document lazy-create rule: do NOT create the file on reads; create directory + file on first write
- [x] 2.3 Document schema template with `version: 1` and `projects: {}`
- [x] 2.4 Document record shape (name, path, keywords, description, createdAt, updatedAt, specialRules?, monorepoRoot?)
- [x] 2.5 Document `getByName` / `list` / `read` read behaviour (including "missing file = empty registry")
- [x] 2.6 Document `add` flow: name-uniqueness check, path-existence check, timestamp set, atomic write
- [x] 2.7 Document atomic write recipe: write temp `projects.json.tmp` → rename over `projects.json`
- [x] 2.8 Document JSON formatting rule: 2-space indent, trailing newline

## 3. Argument Parsing (Priority A)

- [x] 3.1 Parse `ARGUMENTS` for explicit fields (`--name`, `--path`, `--keywords`, `--description`, `--rules`)
- [x] 3.2 Default `--path` to `$CWD` if not provided
- [x] 3.3 Resolve `--path` to an absolute path before any downstream use
- [x] 3.4 If explicit args cover all required fields, skip Haiku and go straight to validation + confirmation

## 4. Haiku Auto-Detection (Priority B)

- [x] 4.1 Write the Haiku subagent prompt: inputs (target path), outputs (single JSON object)
- [x] 4.2 Enumerate monorepo marker files Haiku must check (`pnpm-workspace.yaml`, `nx.json`, `turbo.json`, `lerna.json`, `rush.json`, `package.json#workspaces`, `Cargo.toml [workspace]`, `go.work`)
- [x] 4.3 Define JSON schema the subagent must emit: `{ isMonorepo, monorepoType, subprojects[], keywords[], description, specialRules[] }`
- [x] 4.4 Document the dispatch call shape: `Agent({ model: "haiku", subagent_type: "general-purpose", prompt: ... })`
- [x] 4.5 Document how to parse the subagent response and recover from malformed JSON (single retry with stricter instruction, then fall through to Priority C)

## 5. Monorepo Subproject Selection

- [x] 5.1 When `monorepoType === "multi"` and no subproject was supplied, render the list via `AskUserQuestion`
- [x] 5.2 After selection, set `path` = chosen subproject absolute path, `monorepoRoot` = outer root
- [x] 5.3 When `monorepoType === "single"` or not a monorepo, leave `monorepoRoot` unset and aggregate keywords across the whole tree
- [x] 5.4 Confirmation step: show the user the detected `path`, `monorepoRoot`, `keywords` and allow per-field edit

## 6. Prompted Fallbacks (Priority C)

- [x] 6.1 For each required field still missing after A + B, prompt with `AskUserQuestion` (one field per question)
- [x] 6.2 For `description`, enforce the 10–15-word guideline in the question copy (not as a hard constraint)
- [x] 6.3 For `keywords`, accept a comma-separated string and split/trim/lower-case before persisting
- [x] 6.4 Allow the user to abort at any prompt; abort MUST NOT write

## 7. Validation

- [x] 7.1 Validate `path` exists on disk before proceeding to confirmation
- [x] 7.2 Query the registry for `name` uniqueness; on conflict, re-prompt the user for a new name or abort
- [x] 7.3 Validate `keywords` is non-empty, `description` is non-empty

## 8. Confirmation and Write

- [x] 8.1 Render the fully populated record to the user for final confirmation via `AskUserQuestion`
- [x] 8.2 On confirmation, set `createdAt` and `updatedAt` to the current UTC ISO-8601 timestamp
- [x] 8.3 Execute the atomic write: `Read` current registry (or start from `{ version: 1, projects: {} }`), add the record, serialize, `Write` to `projects.json.tmp`, `Bash mv projects.json.tmp projects.json`
- [x] 8.4 Surface a concise success message quoting the `name` and `path`

## 9. Plugin Metadata

Target version for this change: **`0.6.0`** (minor bump from the current `plugin.json` / `package.json` value of `0.5.0`). Note: `.claude-plugin/marketplace.json` is currently drifted at `0.4.1` and MUST be realigned to the target as part of this change.

- [x] 9.1 Set `claude-plugins/experiments/.claude-plugin/plugin.json` version to `0.6.0`
- [x] 9.2 Set `claude-plugins/experiments/package.json` version to `0.6.0`
- [x] 9.3 Set the `experiments` entry in `.claude-plugin/marketplace.json` to `0.6.0` (this realigns the existing drift from `0.4.1`)
- [x] 9.4 Update `claude-plugins/experiments/README.md` to mention `commander-add` under current experiments (if the README enumerates them)
- [x] 9.5 Verify all three version strings match by running: `jq -r '.version' claude-plugins/experiments/.claude-plugin/plugin.json claude-plugins/experiments/package.json && jq -r '.plugins[] | select(.name=="experiments") | .version' .claude-plugin/marketplace.json` — the three printed values MUST be identical to the target

## 10. Manual Verification

- [x] 10.1 Invoke `/experiments:commander-add` with no args in a non-monorepo directory; confirm Haiku flow → confirmation → file created at `~/.claude/commander/projects.json`
- [x] 10.2 Invoke the command again with a duplicate name; confirm the registry is unchanged and the user is informed
- [x] 10.3 Invoke with an explicit `--path` that does not exist; confirm abort with clear error
- [x] 10.4 Invoke inside a multi-project monorepo (this monolab); confirm subproject prompt and `monorepoRoot` populated
- [x] 10.5 Invoke with all fields as explicit args; confirm Haiku is not dispatched and only the final confirmation is shown
- [x] 10.6 Simulate mid-write interruption (kill between temp-write and rename) and confirm `projects.json` is not corrupted
- [x] 10.7 Inspect the resulting JSON: 2-space indent, trailing newline, correct schema version, required fields present

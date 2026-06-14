# Implementation Tasks

## 1. Scaffolding

- [x] 1.1 Create `claude-plugins/experiments/commands/commander-config-add.md` skeleton with YAML frontmatter (`description`)
- [x] 1.2 Verify the command is discovered by Claude Code (`/experiments:commander-config-add` appears in the slash-command list)

## 2. Config Registry Contract (documented inside the command file)

- [x] 2.1 Document the config registry path constant: `<HOME>/.claude/commander/configs.json` (sibling to `projects.json`)
- [x] 2.2 Document the lazy-create rule: reads MUST NOT create the file; the first write creates `<HOME>/.claude/commander/` recursively and then `configs.json`
- [x] 2.3 Document the schema template: `{ "version": 1, "configs": {} }`; readers MUST abort with `"unsupported config registry version"` on a `version` greater than `1` and MUST NOT overwrite
- [x] 2.4 Document the config-entry shape: an object `{ "path": "<project-relative posix path>" }`; no `type`/`archetypes` fields are persisted (archetype derives from `projects.json[project].keywords`, type from the path)
- [x] 2.5 Document `read()` / `list(projectName)` read behaviour (missing file = empty registry; unknown project = `[]`; reads never create the file)
- [x] 2.6 Document the `add(projectName, entry)` flow: duplicate-path guard, append (creating the project's array if absent), preserve insertion order, preserve `version`, atomic write
- [x] 2.7 Document the atomic write recipe: serialize (2-space indent + trailing newline) → write `configs.json.tmp` → `mv` over `configs.json`

## 3. Argument Parsing (Priority A)

- [x] 3.1 Parse `ARGUMENTS` for `--project <name>` (or first positional) and `--file <relpath>` (or second positional)
- [x] 3.2 If both project and file are supplied, skip the interactive prompts and go straight to normalization + validation

## 4. Target Resolution (Priority C — interactive)

- [x] 4.1 If no project supplied: read `commander-registry.list()`; on empty/missing registry print `"no projects registered"` (hint `/commander:add`) and exit without writing
- [x] 4.2 If no project supplied and registry non-empty: present registered projects via `AskUserQuestion` (include a cancel option)
- [x] 4.3 If an explicit project name is not registered: abort with `"project '<name>' is not registered"`, file unchanged
- [x] 4.4 If no file supplied: prompt via `AskUserQuestion` for the path relative to the chosen project

## 5. Path Normalization and Validation

- [x] 5.1 Normalize the supplied path to a project-relative POSIX path (strip leading `./`, collapse separators); convert an absolute path that lies inside the project to its relative form
- [x] 5.2 Reject a path that escapes the project (`..` segments / absolute path outside `project.path`) with `"config path must be inside the project"`
- [x] 5.3 Validate the resolved absolute path `<project.path>/<relpath>` exists and is a file (`test -f`); else abort with `"config file does not exist: <path>"`

## 6. Duplicate Handling

- [x] 6.1 If the normalized path is already tracked for the project, inform the user (`"already tracked"`) and exit without writing (idempotent no-op); `configs.json` stays byte-equivalent

## 7. Confirmation and Write

- [x] 7.1 Render the project name and the normalized relative path; require explicit confirmation via `AskUserQuestion` (Save / Cancel, Cancel = safe default)
- [x] 7.2 On Cancel: exit without writing; `configs.json` unchanged
- [x] 7.3 On Save: `Read` the current `configs.json` (or start from `{ "version": 1, "configs": {} }`), append `{ path }` to `configs[project]` (creating the array if absent), serialize (2-space + trailing newline), `mkdir -p` the dir, `Write` `configs.json.tmp`, `mv` over `configs.json`
- [x] 7.4 Surface a concise success message quoting the project and the tracked path

## 8. Plugin Metadata & Release

The `experiments` plugin is **release-please-managed** — versions are NOT hand-edited in this branch. `release-please-config.json` bumps `plugin.json`, `package.json`, and the `experiments` marketplace entry in lockstep on the release PR, derived from conventional commits (see `RELEASE.md`). This branch is off `develop`; the `develop → main` weekly cadence triggers the release.

- [x] 8.1 Do NOT hand-edit the `version` in `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, or the `experiments` entry in `.claude-plugin/marketplace.json` — leave them at their `develop` values; release-please owns the lockstep bump
- [x] 8.2 Ensure the implementing commit is a conventional `feat(experiments): …` touching `claude-plugins/experiments/` so release-please schedules the bump
- [x] 8.3 Update `claude-plugins/experiments/README.md` to list `/experiments:commander-config-add` under the Commands section with a short blurb and one example invocation (preserve existing entries)
- [x] 8.4 Do NOT hand-edit `claude-plugins/experiments/CHANGELOG.md` — release-please generates it

## 9. Manual Verification

> QA executed against an isolated `/tmp` fake-HOME fixture (real `~/.claude/commander/` never touched); the command's documented algorithm (parse → resolve → normalize → validate → dedup → atomic write) was run for real with shell/node/jq. `AskUserQuestion` menu selections were scripted (their surrounding branch logic ran for real).

- [x] 9.1 Invoke `/experiments:commander-config-add --project <name> --file <relpath>` for a registered project and existing file; confirm `~/.claude/commander/configs.json` is created with the entry **(QA: RAN — `--project/--file` path lazy-created configs.json with `{version:1,configs:{<proj>:[{path:"eslint.config.js"}]}}`; projects.json shasum unchanged.)**
- [x] 9.2 Invoke with no args; confirm the project picker, then the file prompt, then confirmation → write **(QA: RAN — executed no-args flow; three prompts confirmed in order at commander-config-add.md:129 picker / :136 file / :165-168 Save·Cancel; Save branch wrote byte-correct configs.json, Cancel branch wrote nothing + no `.tmp` residue, projects.json unchanged. Prompt selections scripted.)**
- [x] 9.3 Re-add the same path; confirm an idempotent no-op (file byte-equivalent, "already tracked" message) **(QA: RAN — re-add (and `./`-normalized variant) printed "already tracked"; configs.json byte-equivalent (sha+size unchanged), no `.tmp` residue.)**
- [x] 9.4 Invoke with a `--file` that does not exist on disk; confirm abort with a clear error and no write **(QA: RAN — missing `--file` aborts `"config file does not exist: <path>"` (test -f gate :152); configs.json unchanged / not created.)**
- [x] 9.5 Invoke with a `--file` that escapes the project (`../outside`); confirm rejection **(QA: RAN — `../`, abs-outside, and nested `../..` escapes all abort `"config path must be inside the project"` (:148); abs-inside-project converts to relative; no write on reject.)**
- [x] 9.6 Invoke with a `--project` not in the registry; confirm abort with `"project '<name>' is not registered"` **(QA: RAN — unregistered `--project` aborts `"project '<name>' is not registered"` (:128); configs.json unchanged / not created.)**
- [x] 9.7 Invoke when no projects are registered; confirm `"no projects registered"` and no file created **(QA: RAN — missing AND empty projects.json both print `"no projects registered"` + `/commander:add` hint; configs.json not created.)**
- [x] 9.8 Inspect the resulting JSON: 2-space indent, trailing newline, `version: 1`, entry shape `{ "path": ... }`, `projects.json` untouched **(QA: RAN — jq confirms version:1, entry keys `["path"]` only, 2-space indent, single trailing newline (od ends `7d 0a`), projects.json shasum untouched.)**

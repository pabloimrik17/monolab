# Implementation Tasks

## 1. Scaffolding

- [ ] 1.1 Create `claude-plugins/experiments/commands/commander-config-add.md` skeleton with YAML frontmatter (`description`)
- [ ] 1.2 Verify the command is discovered by Claude Code (`/experiments:commander-config-add` appears in the slash-command list)

## 2. Config Registry Contract (documented inside the command file)

- [ ] 2.1 Document the config registry path constant: `<HOME>/.claude/commander/configs.json` (sibling to `projects.json`)
- [ ] 2.2 Document the lazy-create rule: reads MUST NOT create the file; the first write creates `<HOME>/.claude/commander/` recursively and then `configs.json`
- [ ] 2.3 Document the schema template: `{ "version": 1, "configs": {} }`; readers MUST abort with `"unsupported config registry version"` on a `version` greater than `1` and MUST NOT overwrite
- [ ] 2.4 Document the config-entry shape: an object `{ "path": "<project-relative posix path>" }`; no `type`/`archetypes` fields are persisted (archetype derives from `projects.json[project].keywords`, type from the path)
- [ ] 2.5 Document `read()` / `list(projectName)` read behaviour (missing file = empty registry; unknown project = `[]`; reads never create the file)
- [ ] 2.6 Document the `add(projectName, entry)` flow: duplicate-path guard, append (creating the project's array if absent), preserve insertion order, preserve `version`, atomic write
- [ ] 2.7 Document the atomic write recipe: serialize (2-space indent + trailing newline) → write `configs.json.tmp` → `mv` over `configs.json`

## 3. Argument Parsing (Priority A)

- [ ] 3.1 Parse `ARGUMENTS` for `--project <name>` (or first positional) and `--file <relpath>` (or second positional)
- [ ] 3.2 If both project and file are supplied, skip the interactive prompts and go straight to normalization + validation

## 4. Target Resolution (Priority C — interactive)

- [ ] 4.1 If no project supplied: read `commander-registry.list()`; on empty/missing registry print `"no projects registered"` (hint `/commander:add`) and exit without writing
- [ ] 4.2 If no project supplied and registry non-empty: present registered projects via `AskUserQuestion` (include a cancel option)
- [ ] 4.3 If an explicit project name is not registered: abort with `"project '<name>' is not registered"`, file unchanged
- [ ] 4.4 If no file supplied: prompt via `AskUserQuestion` for the path relative to the chosen project

## 5. Path Normalization and Validation

- [ ] 5.1 Normalize the supplied path to a project-relative POSIX path (strip leading `./`, collapse separators); convert an absolute path that lies inside the project to its relative form
- [ ] 5.2 Reject a path that escapes the project (`..` segments / absolute path outside `project.path`) with `"config path must be inside the project"`
- [ ] 5.3 Validate the resolved absolute path `<project.path>/<relpath>` exists and is a file (`test -f`); else abort with `"config file does not exist: <path>"`

## 6. Duplicate Handling

- [ ] 6.1 If the normalized path is already tracked for the project, inform the user (`"already tracked"`) and exit without writing (idempotent no-op); `configs.json` stays byte-equivalent

## 7. Confirmation and Write

- [ ] 7.1 Render the project name and the normalized relative path; require explicit confirmation via `AskUserQuestion` (Save / Cancel, Cancel = safe default)
- [ ] 7.2 On Cancel: exit without writing; `configs.json` unchanged
- [ ] 7.3 On Save: `Read` the current `configs.json` (or start from `{ "version": 1, "configs": {} }`), append `{ path }` to `configs[project]` (creating the array if absent), serialize (2-space + trailing newline), `mkdir -p` the dir, `Write` `configs.json.tmp`, `mv` over `configs.json`
- [ ] 7.4 Surface a concise success message quoting the project and the tracked path

## 8. Plugin Metadata & Release

The `experiments` plugin is **release-please-managed** — versions are NOT hand-edited in this branch. `release-please-config.json` bumps `plugin.json`, `package.json`, and the `experiments` marketplace entry in lockstep on the release PR, derived from conventional commits (see `RELEASE.md`). This branch is off `develop`; the `develop → main` weekly cadence triggers the release.

- [ ] 8.1 Do NOT hand-edit the `version` in `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, or the `experiments` entry in `.claude-plugin/marketplace.json` — leave them at their `develop` values; release-please owns the lockstep bump
- [ ] 8.2 Ensure the implementing commit is a conventional `feat(experiments): …` touching `claude-plugins/experiments/` so release-please schedules the bump
- [ ] 8.3 Update `claude-plugins/experiments/README.md` to list `/experiments:commander-config-add` under the Commands section with a short blurb and one example invocation (preserve existing entries)
- [ ] 8.4 Do NOT hand-edit `claude-plugins/experiments/CHANGELOG.md` — release-please generates it

## 9. Manual Verification

- [ ] 9.1 Invoke `/experiments:commander-config-add --project <name> --file <relpath>` for a registered project and existing file; confirm `~/.claude/commander/configs.json` is created with the entry
- [ ] 9.2 Invoke with no args; confirm the project picker, then the file prompt, then confirmation → write
- [ ] 9.3 Re-add the same path; confirm an idempotent no-op (file byte-equivalent, "already tracked" message)
- [ ] 9.4 Invoke with a `--file` that does not exist on disk; confirm abort with a clear error and no write
- [ ] 9.5 Invoke with a `--file` that escapes the project (`../outside`); confirm rejection
- [ ] 9.6 Invoke with a `--project` not in the registry; confirm abort with `"project '<name>' is not registered"`
- [ ] 9.7 Invoke when no projects are registered; confirm `"no projects registered"` and no file created
- [ ] 9.8 Inspect the resulting JSON: 2-space indent, trailing newline, `version: 1`, entry shape `{ "path": ... }`, `projects.json` untouched

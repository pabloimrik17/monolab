## Why

MON-155 introduces `commander:config-*`: tracking config files per project and aligning them cross-project by archetype. `config-add` (MON-156) is the entry point — it registers a single config file to track for an already-registered project. Its two blockers are done: MON-128 defined the persistence layer (`projects.json` v2, `commander-registry`) and MON-129 shipped `/commander:add`. Without `config-add` there is no way to populate the per-project config set that `config-list`, `config-scan`, and `config-align` (MON-157 / MON-158 / MON-155) will consume.

## What Changes

- Add a new slash command `/experiments:commander-config-add` that registers a config file (path relative to the project) to track for a registered project. It lives in the **`experiments`** plugin for now — monolab's staging area for beta commander tooling, the same home as the `commander-update-*` family — and graduates to the `commander` plugin later, exactly as the CRUD commands (`add`/`list`/`update`/`delete`) did once stable.
- Introduce a **sibling** persistence file `<HOME>/.claude/commander/configs.json` — separate from `projects.json`, keyed by project name, each value a list of config entries. It has its own versioned schema (`version: 1`) and its own atomic read/add contract. `projects.json` is **not** touched (stays `version: 2`), so the four shipped CRUD commands (`add`/`list`/`update`/`delete`) are byte-for-byte unaffected.
- Resolve the project with priority **A → C** (explicit `--project`/positional → interactive picker from `commander-registry.list()`) and the file path with **A → C** (explicit `--file`/positional → prompt). No auto-detection — bulk discovery is `config-scan` (MON-158).
- Validate on add: the project exists in `projects.json`; the file exists on disk; the path normalizes to a project-relative POSIX path and is rejected if it escapes the project.
- Idempotent: re-adding an already-tracked path is a no-op (no duplicate, file unchanged).
- **Per-file metadata is minimal — only the relative `path`.** Archetype is derived at runtime from the owning project's `keywords` (resolving the ticket's open question: archetype is a project property; storing it per file would duplicate `projects.json.keywords` and risk drift). Entries are objects (`{ path }`, not bare strings) so future per-file metadata is additive, not a breaking shape change.
- The `experiments` plugin version is **not** hand-edited — it is release-please-managed (`release-please-config.json` bumps `plugin.json`, `package.json`, and the `experiments` marketplace entry in lockstep on the release PR, derived from conventional commits). This change ships as a `feat(experiments): …` commit on `develop` so release-please schedules the bump; the `develop → main` weekly cadence triggers the release.

## Capabilities

### New Capabilities

- `commander-config-registry`: the `configs.json` sibling persistence layer — file location, schema `version: 1`, config-entry shape, `read` / `list(projectName)` / `add(projectName, entry)` operations, and the atomic write recipe. Consumed by every `commander:config-*` command.
- `commander-config-add-command`: the `/experiments:commander-config-add` slash command — file location, frontmatter, target resolution (A→C), path normalization + validation, duplicate handling, confirmation, and write.

### Modified Capabilities

- `experiments-plugin`: ADD a requirement that `commands/commander-config-add.md` exists (non-empty `description` frontmatter, invocable as `/experiments:commander-config-add`) and is listed in the experiments `README.md`. Mirrors how the `commander-update-*` commands register against `experiments-plugin`. The version bump is release-please-managed — not part of this change.

## Impact

- **Affected code**:
  - `claude-plugins/experiments/commands/commander-config-add.md` (new)
  - `claude-plugins/experiments/README.md` (mention `/experiments:commander-config-add`)
  - Version files (`claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, the `experiments` entry in `.claude-plugin/marketplace.json`) are **not** edited here — release-please bumps them in lockstep on the release PR.
- **Affected user data**: a new file `<HOME>/.claude/commander/configs.json` is created on the first `config-add`. `projects.json` is untouched (still `version: 2`).
- **Dependencies**: none new. Uses Claude Code built-ins (`Read`, `Write`, `Bash` for `mkdir`/`mv`/`test`, `AskUserQuestion`).
- **Migration**: none — purely additive; a brand-new sibling file with its own version line.
- **Linked tickets**: MON-155 (epic), MON-156 (this feature). Blocked by MON-128 (registry, done) and MON-129 (`commander:add`, done). Blocks MON-157 (config CRUD: edit/delete/list) and MON-158 (`config-scan`).

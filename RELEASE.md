# Release Process

This repo releases two kinds of artifacts:

- **npm/JSR packages** under `packages/` — see the existing `package-release` capability and the [Release Process section in `README.md`](./README.md#release-process).
- **Claude Code plugins** under `claude-plugins/` — covered below.

Both flows are driven by a single `release-please` configuration (`release-please-config.json` + `.release-please-manifest.json`) and the `.github/workflows/release-please.yml` workflow with `target-branch: main`.

## Plugin Releases

Plugins live in `claude-plugins/<plugin>/` and are published as git tags rather than to a registry. Users install them through the Claude Code marketplace (`/plugin marketplace add pabloimrik17/monolab`) and resolve specific versions via the tags described below.

### Tag Convention

Plugin releases use the format:

```text
{plugin-name}--v{version}
```

Examples: `experiments--v0.8.0`, `expo-developer--v0.2.0`.

The double-dash separator (`--`) is mandatory — it is the convention recognized by `claude plugin tag` (Claude Code 2.1.119+) and the semver-range plugin dependency resolver introduced in Claude Code 2.1.110. Single-dash separators conflict with hyphenated plugin names (e.g. `expo-developer-v0.2.0` is ambiguous).

The `v` prefix on the version is required (`include-v-in-tag: true`).

### Conventional Commit Mapping

release-please derives bump levels from conventional-commit messages on commits that touch a plugin's path:

| Commit                                                      | Bump  |
| ----------------------------------------------------------- | ----- |
| `feat(<plugin>): ...` or `feat: ...` affecting plugin path  | minor |
| `fix(<plugin>): ...` or `fix: ...` affecting plugin path    | patch |
| `feat!: ...` or any commit with `BREAKING CHANGE:` footer   | major |
| `chore`, `docs`, `refactor`, `test`, `build`, `ci` (no `!`) | none  |

When no bumping commit exists for a plugin since its last tag, release-please does **not** open a release PR for that plugin.

### File Sync (release-please `extra-files`)

Each plugin entry in `release-please-config.json` declares the files release-please bumps in lockstep when it opens a release PR:

- `claude-plugins/<plugin>/.claude-plugin/plugin.json` — `version` field (canonical source of truth).
- `claude-plugins/<plugin>/package.json` — `version` field (kept in sync with the manifest).
- `.claude-plugin/marketplace.json` — the matching entry under `plugins[]`, reached via array-index jsonpath (e.g. `$.plugins[0].version`).

> ⚠️ **Array-index coupling.** The `extra-files` jsonpath uses array indices, **not** filter expressions. If you reorder entries in `.claude-plugin/marketplace.json`, you **must** update the jsonpath indices in `release-please-config.json` to match, or release-please will silently bump the wrong plugin. Current order:
>
> | Index | Plugin           |
> | ----- | ---------------- |
> | 0     | `expo-developer` |
> | 1     | `experiments`    |

A future hardening step is to switch to jsonpath filter expressions (`$.plugins[?(@.name=='<plugin>')].version`) once support is empirically verified — tracked as a follow-up.

### Release Cadence

- Day-to-day work lands on `develop`.
- Weekly, `develop` is merged into `main`.
- The `release-please.yml` workflow runs on every push to `main`, opens a release PR for each plugin (and package) with new bumping commits since its last tag, and tags + creates a GitHub release on merge.

> **Default-branch caveat.** The GitHub default branch is currently `develop`. Users running `/plugin marketplace add pabloimrik17/monolab` therefore install from `develop` (commit-SHA versions) by default. To install a tagged plugin release, pin via `@ref` or wait until the default branch is flipped to `main` (a separate, future decision).

### Manual Tag Validation

Before pushing a release commit, validate locally with `claude plugin tag --dry-run`:

```bash
cd claude-plugins/experiments && claude plugin tag --dry-run
cd claude-plugins/expo-developer && claude plugin tag --dry-run
```

The CLI checks that `plugin.json` and the matching `marketplace.json` entry agree on the version and prints the proposed tag.

### Adding a New Plugin

1. Scaffold `claude-plugins/<new-plugin>/.claude-plugin/plugin.json` with `name`, initial `version` (e.g. `0.1.0`), and `description`.
2. Add the matching entry under `plugins[]` in `.claude-plugin/marketplace.json`. **Note the new entry's array index** — you will need it in step 4.
3. Add a `package.json` with `"private": true` if you want a workspace-friendly tooling target (optional but recommended).
4. Append a `claude-plugins/<new-plugin>` entry to `release-please-config.json`'s `packages` map, mirroring the existing plugin entries:
    - `release-type: "simple"`
    - `tag-separator: "--"`
    - `include-v-in-tag: true`
    - `extra-files`:
        - `.claude-plugin/plugin.json` (`type: json`, `jsonpath: $.version`)
        - `package.json` (`type: json`, `jsonpath: $.version`) — only if step 3 was followed
        - `../../.claude-plugin/marketplace.json` (`type: json`, `jsonpath: $.plugins[<your-index>].version`)
5. Seed `.release-please-manifest.json` with `"claude-plugins/<new-plugin>": "<initial-version>"`.
6. Document the plugin in `claude-plugins/<new-plugin>/README.md`, including how releases are triggered (point at this file).

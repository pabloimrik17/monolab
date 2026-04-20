# Experiments Plugin

Beta skills and commands staging area for monolab. Features here are experimental and may graduate to production plugins once stable.

## Commands

### `/experiments:commander-add`

Register the current (or specified) project in the user-scoped Commander registry at `~/.claude/commander/projects.json`. Collects `name`, `path`, `keywords`, `description`, and optional `specialRules` via **A → B → C** priority: explicit args, then a Haiku auto-detection subagent, then `AskUserQuestion` prompts. Writes are atomic.

```bash
/experiments:commander-add
/experiments:commander-add --name investlab --path /Users/me/code/investlab --keywords react,typescript --description "Portfolio tracker built with SolidStart."
```

### `/experiments:ralph`

Generate Ralph loop infrastructure from a project description for autonomous AI coding.

```bash
/experiments:ralph "Build auth system with login and logout"
```

Creates 5 files in the current directory:

- `prd.json` - PRD items extracted from description
- `progress.txt` - Iteration tracking file
- `PROMPT.md` - Prompt template with @-references
- `ralph-once.sh` - Single iteration script (HITL)
- `ralph.sh` - Autonomous loop script (AFK)

**Requirements:** Docker Desktop 4.58+ with Docker Sandbox

### `/experiments:hello-experiments`

Explains the purpose of this plugin and lists any experimental features currently available.

### `/experiments:npm-update-patch`

Scan the current project for patch-level npm updates and interactively apply the subset you accept. Works on pnpm/npm/yarn/bun/deno, single-repo or workspace; treats pnpm `catalog:` entries as first-class. Only bumps manifests and runs a single install — no tests, lint, or commits.

```bash
/experiments:npm-update-patch
```

Tip: pair with `/experiments:npm-changelog <pkg> <from>..<to>` before accepting if you want to skim the changelog for any listed patch.

### `/experiments:npm-changelog`

Retrieve, cache, and verify changelogs for any npm package across a version range. Caches under `~/.claude/changelogs/` and only re-fetches when SHA256 verification fails or TTL expires — repeated queries are effectively free.

```bash
/experiments:npm-changelog react 18.0.0..19.0.0
/experiments:npm-changelog @tanstack/query-core 5.90.0..5.90.20
/experiments:npm-changelog @angular/core latest
```

Monorepo-aware: when `repository.directory` is present in npm metadata, the command probes `{directory}/CHANGELOG.md` first, then falls back to the repo root, then to scoped GitHub release tags (`@scope/pkg@{version}`, `{packageBasename}@{version}`, hyphenated variants). The discovered `tagFormat` is cached per-package for subsequent versions.

Authoritative spec: `openspec/specs/npm-changelog-retrieval/spec.md`.

## Skills

### `skills-update-check`

Checks for updates to globally-installed skills.sh skills once per session. Detects the project's package runner, runs `skills check -g`, and offers to apply updates if available.

### `scan-npm-updates`

Shared scan backend used by `/experiments:npm-update-patch` (and by future `npm-update-minor`/`major`/`engines` siblings). Invokes `npm-check-updates@21.0.2` via the detected package manager's dlx runner, post-processes pnpm `catalog:` entries, and returns a structured `ScanResult` JSON object. Read-only — never edits files.

## Testing

```bash
claude --plugin-dir ./claude-plugins/experiments
```

Then use `/experiments:hello-experiments` in the Claude Code CLI.

# Design

## Context

See proposal.md - Why. Facts verified on Claude Code 2.1.289 (2026-10-04) with probe skills and a probe plugin:

- Command body `/probe-locked …` (skill with `disable-model-invocation: true`): skill not loaded.
- Explicit Skill tool call on that skill: refused with "cannot be used with Skill tool due to disable-model-invocation".
- Docs: skills cannot be nested or invoked from another skill's body; subagent `skills:` preload excludes such skills.
- `` !`${CLAUDE_PLUGIN_ROOT}/scripts/<script>` `` in a plugin command, with matching `allowed-tools`: output injected. Inline `` !`cat "$(ls … | head -n 1)"` ``: empty reply.
- End to end with the shipped shape: Sonnet followed `retro` step 1 (`Skill writing-for-agents`) then read session logs; no Skill call for `retro`.

## Goals / Non-Goals

**Goals:**

- `/prompt-presets:matt-retro` runs with `retro`'s instructions, prompt text unchanged.
- Loader reusable by future presets that drive user-only skills.

**Non-Goals:**

- Vendoring `retro`'s text (drifts from upstream; archived design non-goal).
- Installing `retro`: stays a user prerequisite.

## Decisions

1. **Inject via `!` + bundled script.** Only path verified to work. Rejected: nested `/retro` (not expanded), Skill tool (refused), subagent preload (excluded by docs), inline glob in the `!` line (empty reply). Path quoted in both the `!` line and `allowed-tools`: unquoted, a plugin root containing a space splits and the command fails; quoting only the `!` line fails the permission check (both verified).
2. **POSIX `sh`, not Node.** Claude Code's native install does not guarantee `node`; the script only globs and prints. Departs from `experiments`' `.mjs` scripts on purpose.
3. **Generic `<plugin> <skill>` args.** Lookup under `${CLAUDE_CONFIG_DIR:-~/.claude}` (Claude Code's config dir, as claude-hud's status line resolves it): `plugins/cache/*/<plugin>/*/skills/*/<skill>/SKILL.md` and `…/skills/<skill>/SKILL.md`, newest by mtime wins; only if none, standalone `skills/<skill>/SKILL.md`, then project-scoped `$PWD/.claude/skills/<skill>/SKILL.md` (`!` runs in the session cwd). Tiers, not one mtime race: the requested plugin is authoritative, and personal over project matches Claude Code's same-name precedence, so a checkout's own `<skill>` (generic names like `retro` collide) never shadows an installed copy. Covers any marketplace serving the plugin (official or `mattpocock`), any version, the `skills/<bucket>/` layout, and user- or project-scoped skills.sh installs.
4. **Output mirrors Claude Code's own skill load.** `Base directory for this skill: <dir>`, blank line, body without frontmatter. Frontmatter is metadata; the body is what a real skill load hands the model.
5. **Missing skill → notice, exit 0.** Prompt still runs, as before this change, and the model knows why guidance is absent.
6. **No unit-test target.** Plugin has no test setup; adding Vitest for one 15-line script is disproportionate. Verified with a `HOME`-override fixture run and an end-to-end `claude -p` run (tasks).

## Risks / Trade-offs

- [Plugin cache layout is Claude Code internal] → Both `skills/` layouts and `CLAUDE_CONFIG_DIR` tolerated; on a miss the preset degrades to the old behavior (prompt without `retro`), never fails.
- [`!` injection of a user-only skill is undocumented] → Verified on 2.1.289; the user explicitly runs the preset, so invocation stays user-initiated.
- [Newest-mtime pick could be a disabled plugin copy] → Accepted; copies share upstream content.
- [Project-scoped copy comes from the checkout] → Used only when no plugin or personal copy exists; same trust as the checkout's `CLAUDE.md`, which Claude Code already injects.
- [`allowed-tools` pre-approves a script] → Reads only skill files under the Claude config dir and the project's `.claude/skills`; no writes, no network.

## Migration Plan

Ships as `fix(prompt-presets)` in the plugin's first release-please release: `0.2.0`, since #301's `feat` is unreleased (as with `commander`). Marketplace serves `develop`, so installs pick it up on next plugin update. Rollback: revert the commit.

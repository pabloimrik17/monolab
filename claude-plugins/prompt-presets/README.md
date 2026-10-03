# Prompt Presets Plugin

Curated third-party prompts shipped as slash commands. Each preset reproduces its source prompt verbatim — no rewording, additions or removals — so it can be re-run consistently in any project.

## Commands

### `/prompt-presets:matt-retro`

Matt Pocock's "prompt of the day" ([source post](https://x.com/mattpocockuk/status/2105951409887949107)). Credit: [Matt Pocock](https://x.com/mattpocockuk).

```text
/retro read my last 10 coding agent sessions and find ways to make my repo easier to navigate. Find where agents take too long to find relevant information, or rely on out-of-date docs. Improving navigability is such an underrated way to save tokens.
```

**Prerequisite:** Matt Pocock's `retro` skill from [`mattpocock/skills`](https://www.skills.sh/mattpocock/skills/retro) must be installed. The command body is sent as plain prompt text, so `/retro` is not expanded as a slash command; Claude resolves it to the installed skill. Without the skill, the prompt still runs but without its guidance.

Claude reads your recent sessions from the local Claude Code transcripts (`~/.claude/projects/`).

```bash
/prompt-presets:matt-retro
```

## Testing

```bash
claude --plugin-dir ./claude-plugins/prompt-presets
```

Then run `/prompt-presets:matt-retro` in the Claude Code CLI.

## Releases

This plugin is released via git tags formatted `prompt-presets--v{version}`.

Triggers: a `feat(prompt-presets)` or `fix(prompt-presets)` conventional-commit on `main` causes `release-please` to open a release PR. Merging that PR bumps `.claude-plugin/plugin.json`, `package.json`, and the matching entry in the root `.claude-plugin/marketplace.json`, then creates the tag and a GitHub release.

See [`RELEASE.md`](../../RELEASE.md) at the repo root for the full flow, the conventional-commit-to-bump mapping, and the `develop → main` cadence.

# Design

## Context

Plugins live in `claude-plugins/<name>/`, are listed in `.claude-plugin/marketplace.json` and released via release-please (`simple`, `--` tag separator, three version files). `commander` is the closest template: commands-only, private `package.json` with no scripts. See proposal.md for motivation.

Source post text: `/retro read my last 10 coding agent sessions and find ways to make my repo easier to navigate. Find where agents take too long to find relevant information, or rely on out-of-date docs. Improving navigability is such an underrated way to save tokens.` (fetched via search index; x.com was not reachable from the authoring environment; confirmed against the post by the maintainer).

## Goals / Non-Goals

**Goals:**

- Ship the exact prompt as `/prompt-presets:matt-retro`.
- Make the plugin a home for future presets (one `commands/<preset>.md` each).

**Non-Goals:**

- Bundling or reimplementing Matt Pocock's `retro` skill (lives in `mattpocock/skills`); it's an external prerequisite, documented in README.
- Arguments, parameterization (e.g. session count) or prompt edits.
- Tests/scripts — plugin is markdown-only, like `commander`.

## Decisions

1. **Prompt = full post text minus the `Prompt of the day:` label**, including the leading `/retro` and the closing sentence. `/retro` targets Matt Pocock's `retro` skill, which the user has installed; the label is post framing, not prompt. Alternative: drop `/retro` and the closing sentence → rejected by the user (keep the prompt untouched).
2. **Command, not skill; model invocation disabled.** User-invoked, fixed text → `commands/` matches. Commands accept skill frontmatter and are model-invocable by default, so `disable-model-invocation: true` is set: a retro over the user's sessions must never start unasked.
3. **No `$ARGUMENTS`.** "Exactly the prompt" — appending args would alter it.
4. **Attribution in README + frontmatter `description`**, not in body, to keep body verbatim.
5. **Initial version `0.1.0`**, seeded in all three files + release manifest; subsequent bumps via conventional commits `feat(prompt-presets): …`.
6. **Marketplace entry appended last** — reordering would break existing jsonpath-based `extra-files`.

## Risks / Trade-offs

- [Prompt references "my last 10 coding agent sessions" — Claude Code must locate transcripts (`~/.claude/projects/…`) itself] → accepted; verbatim requirement wins. Document the expectation in README.
- [Source text obtained via search snippet, not x.com directly] → maintainer verified it against the post (task 1.1).
- [`/retro` inside a command body isn't expanded as a slash command; the model must map it to the installed skill. Without the skill, or if it's installed under another name, the prompt still runs but without the skill's guidance] → README states the prerequisite; smoke test (2.3) confirms the skill is picked up.
- [Upstream post edits] → preset pinned to the text at proposal time; README links source.

# Design

## Context

Plugins live in `claude-plugins/<name>/`, are listed in `.claude-plugin/marketplace.json` and released via release-please (`simple`, `--` tag separator, three version files). `commander` is the closest template: commands-only, private `package.json` with no scripts. See proposal.md for motivation.

Source post text: `/retro read my last 10 coding agent sessions and find ways to make my repo easier to navigate. Find where agents take too long to find relevant information, or rely on out-of-date docs. Improving navigability is such an underrated way to save tokens.` (fetched via search index; x.com is not reachable from this environment).

## Goals / Non-Goals

**Goals:**

- Ship the exact prompt as `/prompt-presets:matt-retro`.
- Make the plugin a home for future presets (one `commands/<preset>.md` each).

**Non-Goals:**

- Bundling or reimplementing Matt Pocock's `/retro` skill (lives in `mattpocock/skills`).
- Arguments, parameterization (e.g. session count) or prompt edits.
- Tests/scripts — plugin is markdown-only, like `commander`.

## Decisions

1. **Prompt boundary = the sentences after `/retro`, up to "out-of-date docs."** The leading `/retro` invokes Matt's own skill, which this plugin doesn't ship; inside a command body it would be inert text or a broken skill reference. The final sentence ("Improving navigability is such an underrated way to save tokens.") is commentary to readers, not instruction to the agent. Alternative: copy the whole post including `/retro` → rejected, depends on an uninstalled skill. See Open Questions.
2. **Command, not skill.** User-invoked, fixed text, no auto-trigger → `commands/` matches. Skill would allow model auto-invocation, unwanted for a retro over the user's sessions.
3. **No `$ARGUMENTS`.** "Exactly the prompt" — appending args would alter it.
4. **Attribution in README + frontmatter `description`**, not in body, to keep body verbatim.
5. **Initial version `0.1.0`**, seeded in all three files + release manifest; subsequent bumps via conventional commits `feat(prompt-presets): …`.
6. **Marketplace entry appended last** — reordering would break existing jsonpath-based `extra-files`.

## Risks / Trade-offs

- [Prompt references "my last 10 coding agent sessions" — Claude Code must locate transcripts (`~/.claude/projects/…`) itself] → accepted; verbatim requirement wins. Document the expectation in README.
- [Source text obtained via search snippet, not x.com directly] → verify against the post before merging (task 1.1).
- [Upstream post edits] → preset pinned to the text at proposal time; README links source.

## Open Questions

- Should the body keep the leading `/retro` (only useful if the user also installs `mattpocock/skills` retro)? Default: drop it (Decision 1). Changes only the body string, not structure.

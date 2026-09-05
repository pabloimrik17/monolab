## Why

Anthropic models — Opus in particular — flood implementations with narrative prose comments: paragraphs that restate the code, narrate the change, or think out loud. The cost lands twice: the noise ships into the diff, and removing it afterwards burns main-window context re-reading every touched file.

Today this is handled by pasting an ad-hoc prompt after each large implementation. That prompt is unversioned, inconsistent between sessions, and purely reactive — nothing stops the noise from being written in the first place.

## What Changes

- **New skill `writing-comments`** (prevention). Owns the single source of truth for comment policy at `skills/writing-comments/reference/policy.md`. Applies to comments written from its invocation onward, including in files already touched earlier in the session. No retroactive sweep.
- **New skill `purge-comment-noise`** (post-hoc purge). Reviews the branch diff against the merge-base with its base branch — `git merge-base <ref> HEAD` on the first candidate ref that resolves, not that ref's own tip — together with the uncommitted working tree and untracked files, the latter listed with `git ls-files --others --exclude-standard` and each treated as wholly added, weighed the same at every threshold. Deletes prose comments that carry no value, tightens the ones it keeps. Reads the same `policy.md` via `${CLAUDE_PLUGIN_ROOT}`.
- **New command `/experiments:purge-comments`**. Manual entry point to the purge, bypassing the autonomous trigger threshold. Accepts an optional git ref or path scope.
- **Self-propagating discovery pointer.** Once per session, `writing-comments` checks for a one-line pointer in `~/.claude/CLAUDE.md` and, when absent, _proposes_ adding it. The check does not repeat on later invocations in that session, and a declined proposal is never re-offered. It never writes to user configuration on its own.
- **Plugin README** gains rows for the two skills and the command.
- No manual version edits to `plugin.json`, `package.json`, or `marketplace.json` — release-please owns those.

Scope of the policy is drawn by _comment kind_, not by judgement call: free-form prose (`//`, `/* */`) is in scope and deny-by-default; JSDoc/TSDoc (`/** */`), pragmas, licences, and tool directives are out of scope by construction and never touched.

## Capabilities

### New Capabilities

- `writing-comments-skill`: prevention skill and the canonical comment policy it owns — what makes a comment worth writing, what is out of scope, and how the discovery pointer is proposed.
- `purge-comment-noise-skill`: post-hoc purge skill — diff scoping, file coverage, autonomous trigger thresholds, fan-out to teammates, edit application and reporting.
- `purge-comments-command`: the `/experiments:purge-comments` slash command — argument handling and delegation to the purge skill.

### Modified Capabilities

- `experiments-plugin`: registration of the two new skills and the new command (auto-discovered from `skills/` and `commands/`), plus the README listing requirement; and a second requirement, marketplace registration is repo-root only — the orphan plugin-local manifest is removed and the root manifest is the sole authoritative registration.

## Impact

- **Files**: two new skill directories and one command file under `claude-plugins/experiments/`; one README edit. It also deletes `claude-plugins/experiments/.claude-plugin/marketplace.json`, an orphan manifest holding only a version field that release-please never writes — its experiments extra-file targets the repo-root `/.claude-plugin/marketplace.json`, and no sibling plugin carries a plugin-local copy. It also quotes the YAML `description` of `skills/group-packages-for-research/SKILL.md`, whose `": "` sequence made the plain scalar ambiguous and left the skill with no usable description. It also adds the `## Skills` rows for `skill-terraformer`, `hookify` and `npm-update-deep-orchestrator`, three pre-existing skills the README had never listed, so the section finally covers every directory under `skills/`. No source packages, no build targets, no CI configuration.
- **Distribution**: reaches every machine through the existing `monolab` marketplace; no install step beyond the plugin update.
- **User configuration**: `~/.claude/CLAUDE.md` may gain one line, only on explicit user confirmation. Nothing in this change writes it.
- **Behavioural blast radius**: the purge edits source files in place. It is diff-scoped and branch-local, so `git` remains the undo path. No verification gate is forced; the report recommends running the repository's gates before committing.

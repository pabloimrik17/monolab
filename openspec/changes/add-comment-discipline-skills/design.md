## Context

See `proposal.md` — Why. Requirements live in `specs/`; this document covers the how.

Three constraints shape the approach:

- **Skills trigger on declared intent, not on actions.** There is no event for "an agent is about to type a comment". Anything that depends on catching that moment is unreliable by construction.
- **The purge exists to save main-window context.** Any design that routes file contents back through the orchestrator defeats its own purpose.
- **The `experiments` plugin is auto-discovered.** Skills and commands are picked up from `skills/` and `commands/`; versions are release-please's. Nothing here hand-edits a manifest.

## Goals / Non-Goals

**Goals:**

- One policy, authored once, consumed by both the prevention and the purge paths.
- A purge whose trigger condition is measurable rather than a judgement call.
- Fan-out that keeps file contents out of the orchestrator's context.

**Non-Goals:**

- Enforcing comment discipline through hooks or lint rules. Out of scope for this change.
- A mechanical length cap on retained comments. The first iteration keeps the criterion qualitative; a numeric cap is revisited once there is evidence from real runs.
- Purging JSDoc/TSDoc on non-exported symbols. Mechanically decidable via the `export` keyword, but deferred — see Risks.

## Decisions

### Two artifacts, one policy file

The prevention and purge paths have incompatible trigger shapes: prevention must be present continuously, the purge fires once at the end. A single skill covering both would have a description that matches neither moment well.

They are split, but the policy is written once at `skills/writing-comments/reference/policy.md` and read by the purge through `${CLAUDE_PLUGIN_ROOT}` — the pattern already used by `parallel-research-workflow` for plugin scripts. Two skills restating the same rules would drift, and a drifted purge undoes what prevention just did.

*Alternative considered:* one skill with two modes. Rejected on triggering, not on content.

### Scope drawn by comment kind, not by judgement

The policy is deny-by-default, which is only safe because the dangerous category is excluded by *definition* rather than by exception. JSDoc/TSDoc, pragmas, licences, and tool directives are out of scope by construction — an agent never has to decide whether a `/** */` block is "important enough" to keep.

*Alternative considered:* an allow-list of noise categories with everything else retained. Rejected: that is the current ad-hoc prompt, and it leaves the agent free to rationalise keeping anything.

### The trigger threshold is a number

"After an extensive implementation" is exactly the kind of phrase that gets reinterpreted every session. The description instead states a condition the agent can *measure* with `git diff --stat`: at least 5 changed files or at least 150 added lines. Explicit invocation bypasses it.

*Alternative considered:* a `Stop` hook. Rejected — it fires on every turn, including turns that changed no code.

### Discovery is a pointer, not a copy

A one-line pointer in `~/.claude/CLAUDE.md` guarantees `writing-comments` is discoverable mid-flow, which is the case that matters: the skill is found at the start of a declared task, but comments appear throughout a long one. The pointer names the skill and nothing else — the policy stays in one place.

The skill proposes the line and waits. It never writes user configuration on its own; an agent that silently injects standing instructions into a user's global config is a worse problem than the one being solved.

### Fan-out splits by whole file and returns counts

An agent holding half a file cannot tell whether a comment is redundant with the code it cannot see, so assignment is per whole file. Agents edit in place and return only counts plus a handful of doubtful cases — returning proposals would pull every file back through the orchestrator.

Below the fan-out threshold the work runs in line: spawning agents for six files costs more context and latency than it saves.

### Authoring and audit toolchain

The deliverables here are themselves agent-facing prose, so they are written and audited with the skill-development tooling already installed rather than freehand. Implementation SHALL use:

**Authoring**

- `skill-creator` — skill scaffolding, and description optimisation for triggering accuracy. Directly relevant: both skills live or die by whether their description fires at the right moment.
- `plugin-dev:skill-development` — skill structure and progressive disclosure, which is exactly the `SKILL.md` vs `reference/policy.md` split used here.
- `plugin-dev:command-development` — for `commands/purge-comments.md`.
- `plugin-dev:plugin-structure` — placement and auto-discovery conventions within the plugin.
- `superpowers:writing-skills` — creating and editing skills, and verifying them before deployment.
- `mattpocock-skills:writing-for-agents` — prose written to be executed by an agent rather than read by a person.
- `elements-of-style:writing-clearly-and-concisely` — concision. A skill that preaches short comments must not itself be verbose.

**Audit**

- `plugin-dev:skill-reviewer` (agent) — quality review of each finished `SKILL.md`, including description triggering.
- `plugin-dev:plugin-validator` (agent) — plugin structure and manifest validation after the new files land.
- `skill-creator` evals — measure whether each description triggers when it should and stays silent when it should not.

Explicitly *not* used: `experiments:skill-terraformer` and `experiments:skills-update-check` install and update skills.sh skills; neither has anything to do with authoring.

## Risks / Trade-offs

- **A skill cannot guarantee it fires before the first comment is written.** → The pointer in `~/.claude/CLAUDE.md` raises discovery to the start of any declared task, and the purge remains the backstop for whatever slips through. Prevention is a reduction, not a guarantee.
- **Deny-by-default deletes a comment that was actually load-bearing.** → Scope is limited to lines the branch itself added or modified, so the blast radius is the branch's own new prose, and `git` is the undo path.
- **Bloated JSDoc on internal symbols survives.** → Accepted for v1. Deciding by `export` is mechanical, but in a monorepo with barrel files `export` does not mean public API, and getting it wrong deletes real documentation. Revisit with evidence.
- **A deletion removes a line of real code** (comment inside a template literal or JSX). → Low but non-zero. No gate is forced, so the report explicitly recommends running the repository's gates before committing, covering pre-existing uncommitted changes too.
- **The policy in `writing-comments` and the pointer line drift apart.** → The pointer carries no policy content, only the skill name. There is nothing in it to drift.
- **Thresholds are guesses.** 5/150 for triggering and 8/400 for fan-out are unvalidated first numbers. → They are stated in one place per skill so they are cheap to retune once there is real usage.

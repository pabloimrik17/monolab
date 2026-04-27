## Why

`/experiments:npm-update-patch` bumps patch-level dependencies but tells the user nothing about *what changed* or *what is worth adopting*. After running it, the developer still has to read every changelog by hand to decide whether a fix matters, whether a new API applies to this codebase, or whether an existing workaround can finally be removed. For a monorepo with 30+ patch updates that is hours of manual review, and most of it gets skipped — patch updates are routinely applied without inspection, which leaves applicable improvements on the table and merges unknown regressions into the tree.

The "deep" variant turns that flow inside out: scan, fetch every relevant changelog, dispatch parallel research subagents that read the changelogs *against this codebase*, then hand the main agent a single integrated plan of (a) applicable improvements and (b) workarounds the new versions resolve. The user picks what to apply. Patch is the right starting level — semver-safe, high volume, lowest review fatigue, highest leverage. It is also the first command of the `npm:update-deep-*` family, so the orchestration introduced here is built generic and deep-minor / deep-major / deep-engines reuse it unchanged.

## What Changes

- **NEW capability `parallel-research-workflow`** — generic two-phase (changelog fetch, codebase research) parallel subagent orchestration, plan-directory lifecycle, integrity verification, and handoff to the main agent for plan-mode synthesis. Reusable by every future `deep-*` command.
- **NEW capability `dependency-grouping-strategy`** — deterministic algorithm that partitions a list of update candidates into subagent groups (monorepo-aware coalescing + per-group cap). Reusable by anything that fans package work out to subagents.
- **NEW capability `npm-update-deep-patch-command`** — the user-facing `/experiments:npm-update-deep-patch` command that wires `npm-update-scanning` (level=patch) → grouping → research workflow → user-driven execution → cleanup.
- **NEW skill files** in `claude-plugins/experiments/skills/`: `parallel-research-workflow/SKILL.md` and `group-packages-for-research/SKILL.md`.
- **NEW command file** `claude-plugins/experiments/commands/npm-update-deep-patch.md`.
- **Plan storage** under `~/.claude/experiments/plans/<project>-<level>-<unix-ts>/`. Stale-cleanup (>10 days) on each invocation. User-level location, separate from the commander registry — different domain.
- **Decisions baked into design.md** for two open spikes that previously blocked this work: grouping strategy (was MON-141) and research detail level (was MON-142). The starting choices are pragmatic and revisitable; their exit criteria are documented.
- **Reuses without modification**: existing `npm-update-scanning` capability (the `scan-npm-updates` skill already accepts `level=patch` and emits the structured `ScanResult` consumed by this command) and the `npm-changelog-*` capability family (retrieval, caching, parsing, verification) — invoked by subagents during phase 1.
- **Non-changes preserved**: `npm-update-patch` (the shallow command) is not modified or deprecated. The two coexist; deep is opt-in for "I want context before applying".

## Capabilities

### New Capabilities

- `parallel-research-workflow`: two-phase parallel subagent research with on-disk plan directory persistence, integrity verification, and hand-off to the main agent for plan-mode synthesis.
- `dependency-grouping-strategy`: deterministic partitioning of update candidates into subagent groups using monorepo coalescing + size bucketing with a configurable per-group cap.
- `npm-update-deep-patch-command`: the `/experiments:npm-update-deep-patch` user-facing command and its workflow scoped to patch-level updates.

### Modified Capabilities

None. `npm-update-scanning` is referenced verbatim — the existing `scan-npm-updates` skill already covers MON-135's responsibilities (PM detection, repo type, level filtering, `minimumReleaseAge`, structured output).

## Impact

- **New files**:
  - `claude-plugins/experiments/commands/npm-update-deep-patch.md`
  - `claude-plugins/experiments/skills/parallel-research-workflow/SKILL.md`
  - `claude-plugins/experiments/skills/group-packages-for-research/SKILL.md`
- **User-level disk writes** under `~/.claude/experiments/plans/...` (outside the repo). Cleaned up on subsequent invocations; full layout in `design.md`.
- **Subagent dispatch** uses the native Claude Code subagent mechanism — no new MCP servers, no new external dependencies.
- **No code dependencies added**: skills are markdown instruction files; the command consumes existing skills.
- **Plugin version bump** (experiments) on implementation — minor (new capability, no breaking change). Tracked in `tasks.md`.
- **No spec changes** to existing capabilities.
- **Closes spikes by decision**: MON-141 (grouping) and MON-142 (research detail) are resolved by the choices documented in `design.md`; their issues can be closed when this change is archived.
- **Unblocks**: the rest of the `npm:update-deep-*` family (deep-minor / deep-major / deep-engines) will reuse `parallel-research-workflow` and `dependency-grouping-strategy` as-is, contributing only their own command capability. `commander:update-deep-*` (cross-project) builds on top.

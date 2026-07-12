# Tasks

Reword the live plugin files to match the reworded specs. Pattern per site: drop the _"SHALL NOT run tests, lint, or build"_ forbiddance → state the commit/push/PR review-gate invariant + a permission note (read-only checks permitted, never auto by default). Rewrite scenario/assertion copy that named lint/build to the real invariant (commit/push/PR only). No `--fix`, no auto-run, no behavior change on a default run.

## 1. Canonical skills

- [x] `skills/commander-update-orchestrator/SKILL.md`
  - [x] Frontmatter `description:` — "Never runs tests, lint, build, or commits." → "Never commits/pushes/opens PRs autonomously."
  - [x] Purpose intro line ("never runs tests/lint/build, and never creates commits"). (only the frontmatter carried this claim; no separate intro line)
  - [x] Hard rules section (`SHALL NOT run tests, lint, or build at any point`) → gate + permission; align the commit bullet to "commits/push/PR (isolation branch/worktree permitted)".
  - [x] Plan-mode round line ("The plan-mode round SHALL NOT execute tests, lint, or build") → MAY run read-only checks on reviewed edits.
  - [x] Deep-mode `Suggested next steps` — strengthen the "branch may not pass repo commit hooks; run lint/build before committing" note.
- [x] `skills/apply-npm-updates/SKILL.md` — Hard rules reword (matches `npm-update-apply` spec delta).
- [x] `skills/apply-engine-bumps/SKILL.md` — VCS-safe contract sentence + `description:` (drop "run tests/lint/build").

## 2. Sub-skills (consistency — live-only, no spec delta)

- [x] `skills/parallel-research-workflow/SKILL.md` (L707) — reword the `SHALL NOT execute tests, lint, or build` bullet to the plugin-wide invariant (workflow is read-only research; state descriptively, not as a check prohibition).
- [x] `skills/update-isolation/SKILL.md` (L113) — same reword.

## 3. npm-update command files

- [x] `commands/npm-update-patch.md` — hard-rule / "Not execute tests, lint, build" reword + next-steps note.
- [x] `commands/npm-update-minor.md`
- [x] `commands/npm-update-major.md`
- [x] `commands/npm-update-engines.md`
- [x] `commands/npm-update-deep-patch.md` — Tip line + hard rules + Improvement-application step (add: MAY lint the reviewed migration/improvement edits, surface in summary).
- [x] `commands/npm-update-deep-minor.md` — Tip + hard rules + deep round nudge.
- [x] `commands/npm-update-deep-major.md` — Tip + hard rules + deep round nudge.
- [x] `commands/npm-update-deep-engines.md` — Tip + hard rules + deep round nudge.

## 4. commander-update command files

- [x] `commands/commander-update-patch.md` — hard-rule reword + no-commit/test scenario copy.
- [x] `commands/commander-update-minor.md`
- [x] `commands/commander-update-major.md`
- [x] `commands/commander-update-engines.md`
- [x] `commands/commander-update-deep-patch.md` — Tip + hard rules + deep round nudge.
- [x] `commands/commander-update-deep-minor.md`
- [x] `commands/commander-update-deep-major.md`
- [x] `commands/commander-update-deep-engines.md`

## 6. Sibling commander command spec deltas (coherence fix)

Verify surfaced that `commander-update-{minor,major,engines}` and `commander-update-deep-{minor,major,engines}` restate `SHALL NOT run tests/lint/build` **normatively** (requirement prose, not just no-op scenario assertions) — the design Open-Question tripwire. Added MODIFIED deltas dropping the clause so they no longer contradict the reworded canonical orchestrator rule + live files. (`commander-update-{patch}` and every `npm-update-*` sibling already had deltas.)

- [x] `specs/commander-update-minor-command/spec.md` (also D6: `commits/branches/PRs` → isolation-permitting phrasing).
- [x] `specs/commander-update-major-command/spec.md`
- [x] `specs/commander-update-engines-command/spec.md`
- [x] `specs/commander-update-deep-minor-command/spec.md` (also D6 branch-phrasing align).
- [x] `specs/commander-update-deep-major-command/spec.md`
- [x] `specs/commander-update-deep-engines-command/spec.md`
- [x] `specs/commander-update-deep-patch-command/spec.md` — bullet-form ban (`SHALL NOT: - Run tests, lint, or build`) missed by the narrow verify grep; delta drops the bullet + aligns the `commits, branches, or PRs` bullet to isolation-permitting phrasing (D6). (7 commander specs, not 6.)
- [x] Capability-overview prose lines (L5, not requirement-delta-addressable) reworded directly during sync — these carry a forbidding tests/lint/build claim outside any requirement: `commander-update-orchestrator-skill`, `npm-update-engines-command`, `engine-update-apply`. All now read "never commits/pushes/opens PRs autonomously (read-only checks permitted, never automatic)".

## 5. Verification

- [x] `grep -rE "SHALL NOT run tests, lint, or build|Never runs? tests, lint|tests/lint/build" claude-plugins/experiments` returns no _forbidding_ occurrences (only permitted-form phrasing remains). (Also reworded `README.md` catalog entries, which the file list omitted but this grep covers; orchestrator L722 reconnaissance stays "Pure read" per the proposal non-goal — not matched by this grep.)
- [x] `grep -rniE "SHALL NOT run tests" openspec/specs/commander-update-*` returns no matches after the deltas archive (the 6 sibling command specs no longer forbid checks normatively).
- [x] `openspec validate relax-update-hard-rules` passes.
- [x] Spot-check: a plain (shallow) run description still invokes no checks (default behavior unchanged); every deep command's round now permits read-only verification of its edits.
- [x] Confirm each command's `Suggested next steps` carries the "branch may not pass repo commit hooks — run lint/build before committing" note. (npm-update-* carry it directly; commander-update-* surface the orchestrator's summary, which carries it.)
- [x] Confirm no commit/push/PR permission was widened (the gate stays; only the tests/lint/build ban is lifted).

## Context

The `experiments` update commands + the `commander-update-orchestrator` skill carry a blanket hard rule: _"SHALL NOT run tests, lint, or build at any point."_ It is duplicated (as a forbidding hard-rule bullet, an inline clause, or the orchestrator skill's `description:` frontmatter) across ~19 specs. Issue #249 documents the harm on major bumps: the cheapest breakage signal is forbidden, the deep plan-mode migration round's own edits ship unverified, and the produced branch can only be landed with `git commit --no-verify`.

Crucially, the real safety invariant — no autonomous commit/push/PR — is **already** stated by a separate bullet in each spec. The tests/lint/build ban is redundant over-reach that conflates read-only checks with the outward/irreversible actions that actually warrant a gate.

## Goals / Non-Goals

**Goals:**

- Remove the blanket tests/lint/build prohibition wherever it is stated normatively.
- Make the single default hard rule explicit: no autonomous commit/push/PR before human-in-the-loop review.
- Keep default behavior byte-for-byte: a plain run still runs no checks (permitted ≠ mandatory).
- Let the deep migration round self-verify its own edits (lint/typecheck), addressing #249's "migration edits unverified."

**Non-Goals:**

- No new gated opt-in verify skill/capability (the heavier "post-apply-verify step" design is a documented follow-up, not this change).
- No mandatory verify prompt, no auto-`--fix`, no auto-run of tests.
- No change to branch/worktree isolation, reconnaissance/scan (stays pure), or any non-verification hard rule.

## Decisions

**D1 — Reword the rule, don't build a verify machine.** The issue proposed an opt-in verify step; we chose the smaller, honest fix: the rule itself is wrong (conflates read-only with outward). Removing the over-reach + clarifying the invariant delivers ~80% of the value at ~15% of the surface. _Alternative:_ full gated verify skill (prompt + runner + script discovery + feed-round). Rejected as premature; kept as follow-up.

**D2 — The invariant is the commit/push/PR review gate.** Outward/irreversible actions (commit, push, PR) require the human. Local edits (manifest bumps, plan-mode-reviewed migration edits) are reversible (`git checkout`) and need no ban. Running read-only checks (lint, typecheck, build) is explicitly permitted and "never a hard-rule violation."

**D3 — Permitted ≠ mandatory.** Every reworded requirement states checks are permitted _but never performed automatically by default_, so shallow/default runs stay behaviorally unchanged (preserves the orchestrator's shallow byte-equivalence guarantee).

**D4 — Reword scenario assertions to the real invariant.** Scenarios that asserted _"no vitest/nx test/lint/build/commit invoked"_ are renamed to **No autonomous commit/push/PR** and assert only _no `git commit` / `git push` / PR-creation_. They no longer assert the absence of lint/build (which is now allowed).

**D5 — Deep round self-verify nudge.** `npm-update-deep-*` "Improvement application via plan mode" / Hard rules now say the command **MAY** run read-only verification over the reviewed migration edits and surface the result — no `--fix`, not automatic. This is the direct answer to #249 complaint #2, expressed as permission, not machinery.

**D6 — Coherence fix on the commit bullet.** The orchestrator + `npm-update-apply` specs said _"SHALL NOT create git commits, branches, or pull requests"_ — contradicting the opt-in isolation feature that creates branches. While rewording, aligned to _"commits, push, or pull requests autonomously (isolation branch/worktree via `update-isolation` permitted)"_, matching the newer command specs.

**D7 — Two edit layers.** Spec deltas (this change) reword `openspec/specs/`. Implementation (tasks → apply) reword the live plugin files: `claude-plugins/experiments/commands/*.md` hard-rule sections and `skills/*/SKILL.md` frontmatter `description:` + purpose lines, plus each command `.md`'s _Suggested next steps_ note ("branch may not pass repo commit hooks").

## Risks / Trade-offs

- **Reword doesn't force verification to run** (permitted ≠ mandatory) → mitigated by the D5 deep-round nudge + strengthened next-steps note; deterministic self-verify remains the follow-up.
- **Wide surface from duplication** (~12 spec deltas + many live files) risks drift/inconsistency → mitigated by a single uniform reword pattern; de-duplication (command specs referencing the orchestrator's canonical rule) noted as follow-up.
- **Frontmatter `description:` feeds skill triggering** → change only the tests/lint/build/commit claim; keep the rest of the description intact so triggering is unaffected.
- **`--no-verify` habit** → resolved structurally: the plugin no longer commits, so the human commits through hooks after review; no `--no-verify` needed.

## Migration Plan

No runtime/data migration. Spec + docs change only. Deploy = merge; the live plugin `.md`/`SKILL.md` edits take effect on next command invocation. Rollback = revert the commit (no state to unwind).

## Open Questions

- The `commander-update-{minor,major,engines}` and `commander-update-deep-*` command specs match the prohibition only in _default no-op scenario assertions_. Decision: leave them (default behavior unchanged, assertions stay valid); confirm at apply. Reopen only if an assertion turns out to forbid lint normatively.
- Should tests (not just lint/typecheck/build) be explicitly encouraged in next-steps copy? Current stance: the invariant permits all checks; copy emphasizes the cheap read-only ones (lint/typecheck/build).

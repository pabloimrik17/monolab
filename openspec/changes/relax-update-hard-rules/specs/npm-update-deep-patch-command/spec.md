## MODIFIED Requirements

### Requirement: Improvement application via plan mode

For `apply-all` and `pick-subset` (when improvements are included), the command SHALL apply improvements via Claude Code plan mode — never via blind edits. The flow SHALL be:

1. **Reconnaissance**: the main agent reads each in-scope improvement bullet's area hints and the relevant files to determine the concrete edits the bullet translates into in this codebase. Bullets whose opportunity does not actually land here are flagged as `inapplicable` with a one-sentence reason.
2. **Plan-mode entry (mandatory)**: the main agent invokes the `EnterPlanMode` tool with a markdown plan listing every applicable improvement (file path, brief description, and before/after snippet for non-trivial edits) and every inapplicable improvement (with the reason). A summary footer counts applicable vs inapplicable.
3. **User review**: plan mode pauses until the user accepts or rejects the plan. On approval, edits are executed via `Edit` / `Write`. On rejection, the command prints `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.` and skips to the summary step. Bumps applied in the prior step are NOT reverted.

After the reviewed edits are applied, the command MAY run read-only verification (lint, typecheck, or build) over those edits and surface the result in the final summary — never with `--fix`, and never automatically by default. The command SHALL NOT create commits or PRs as part of improvement application; it stops for human-in-the-loop review before any such outward/VCS action. The command SHALL NOT expand scope beyond bullets present in `plan.md`; adjacent opportunities the agent identifies during reconnaissance or plan-mode review SHALL be surfaced as suggestions in the final summary, never silently added to the plan-mode plan.

#### Scenario: Plan mode is entered before any improvement edit

- **WHEN** the user selects `apply-all` after the bumps install completes
- **THEN** the command invokes `EnterPlanMode` with a markdown plan listing the proposed edits per improvement bullet, BEFORE any `Edit` or `Write` call against a workspace file

#### Scenario: Inapplicable bullets are explicit

- **WHEN** the plan contains 10 improvement bullets and reconnaissance finds that 7 do not land in this codebase
- **THEN** the plan-mode plan lists those 7 explicitly with one-sentence reasons each, alongside the 3 applicable bullets with their concrete edits

#### Scenario: Plan-mode rejection preserves bumps

- **WHEN** the user rejects the plan-mode plan after bumps already landed in Step 6a
- **THEN** the command prints `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.` and proceeds to the summary; no improvement edits are made and no bumps are reverted

#### Scenario: Improvements scoped to plan content

- **WHEN** the user selects `apply-all` and the plan contains 4 improvement bullets
- **THEN** improvement application proceeds against exactly those 4 bullets, with no expansion to items outside `plan.md`

#### Scenario: No autonomous commit/push/PR

- **WHEN** improvement application completes
- **THEN** no `git commit`, `git push`, or pull-request-creation command has been invoked by the command

### Requirement: Hard rules

The command SHALL preserve every hard rule of `/experiments:npm-update-patch`:

- Running read-only verification (lint, typecheck, or build) is permitted and is never a hard-rule violation; the command performs none automatically by default, so a plain run stays behaviorally unchanged. The binding restriction is the commit/push/PR review gate below.
- The command SHALL NOT create commits, push, or open pull requests autonomously; it stops for human-in-the-loop review before any such outward/VCS action.
- The command SHALL NOT modify any file when the user selects `cancel`.
- The command SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.

#### Scenario: Cancel touches no files

- **WHEN** the user selects `cancel` at any prompt in the flow
- **THEN** no file outside `~/.claude/experiments/plans/` has been modified

#### Scenario: Catalog reference preserved

- **WHEN** a workspace package's `package.json` declares a dependency as `catalog:`
- **THEN** that `package.json` is NOT modified during bump application

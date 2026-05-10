## 1. Skill scaffold

- [x] 1.1 Create directory `claude-plugins/experiments/skills/commander-update-orchestrator/` with `SKILL.md`.
- [x] 1.2 Write YAML frontmatter (`name: commander-update-orchestrator`, `description: <one-line>`).
- [x] 1.3 Document the input contract section (`level`, `target`, `overrideRegistryPath`, `projectsFilter`) and the precondition error messages.
- [x] 1.4 Reference the `commander-registry` reader contract from `commander-add.md` for the registry read recipe (no shared sidecar — inline-by-reference like the other commander commands).

## 2. Project resolution

- [x] 2.1 Implement registry read with lazy-create-aware behavior (missing file → empty registry, no `mkdir`).
- [x] 2.2 Implement version gate: abort with `unsupported registry version: <n>` when `version > 2`.
- [x] 2.3 Apply `projectsFilter` (when provided): reject unmatched names with a one-line warning, proceed with matched subset.
- [x] 2.4 For each retained record, run `Bash test -d "<path>"` and skip records where the directory is missing; record the skip in the summary buffer.
- [x] 2.5 Pass-through legacy v1 records (no `repoType`); do NOT synthesize the field, do NOT abort.
- [x] 2.6 Empty-registry / empty-after-filter early exit prints the exact strings specified in the spec.

## 3. Project subset prompt

- [x] 3.1 When `projectsFilter` is unset and the post-resolution set is non-empty, raise a single `AskUserQuestion` (multi-select) with one option per project plus a final `all` option.
- [x] 3.2 Option labels follow `<name> — <path>`; `all` label is `All registered projects (<N>)`.
- [x] 3.3 Empty selection → print `No projects selected. Cancelled.` and exit zero.
- [x] 3.4 Skip the prompt entirely when `projectsFilter` is provided.

## 4. Parallel scan dispatch

- [x] 4.1 Send a single message containing N `Agent` tool-uses (one per project) configured with `model: "haiku"`, `subagent_type: "general-purpose"`, working directory at the project's `path`.
- [x] 4.2 Embed the agent prompt: invoke `experiments:scan-npm-updates` with the input `level` and return only the `ScanResult` JSON (no prose).
- [x] 4.3 Parse each agent response as JSON; on parse failure or `scan-npm-updates` precondition error, mark the project as `scan-failed` and continue.
- [x] 4.4 Build the `ScanResultByProject` map keyed by project name.

## 5. Cross-project aggregation

- [x] 5.1 Group every update across every project by package `name`; preserve first-occurrence order across the project iteration order.
- [x] 5.2 Concatenate `warnings[]` from each `ScanResult`, prefixing each warning with `<projectName>: `.
- [x] 5.3 Build the `CrossProjectPlan` value with `packages[]`, `warnings[]`, `scanFailed[]`, `pathMissing[]`.

## 6. Version alignment

- [x] 6.1 For each aggregated package, compute `proposedTarget = max(occurrences[].targetVersion)` (strip leading `^`/`~`/`=` for the comparison; preserve the prefix of the highest occurrence on output).
- [x] 6.2 Compute `conflict = true` for any package where at least one occurrence's declared range does not admit `proposedTarget` (semver `satisfies(proposedTarget, currentVersion)`).
- [x] 6.3 If any package is in conflict, raise exactly one `AskUserQuestion` with options `use-max-where-possible` / `per-project` / `skip-package`. The chosen policy applies to every conflicting package in the run.
- [x] 6.4 Materialize the post-policy plan: drop packages under `skip-package`; preserve per-project targets under `per-project`; partition occurrences under `use-max-where-possible`.

## 7. Plan rendering

- [x] 7.1 Render the markdown table with columns `package | proposed target | projects | locations`, sorted alphabetically by `package`.
- [x] 7.2 Append `Warnings:` heading with bullet list when `warnings[]` is non-empty.
- [x] 7.3 Append `Skipped (scan-failed):` and `Skipped (path missing):` headings (each only when their list is non-empty).
- [x] 7.4 Empty-plan early exit: print `No <level> updates available across selected projects.` after warnings and exit zero.

## 8. Override registry

- [x] 8.1 Load `pkg-upgrade-overrides.yaml` from `overrideRegistryPath`. On missing/parse failure: print one-line warning, continue without overrides.
- [x] 8.2 Compute first-win matches across the cross-project package set (mirror Step 5.5 of `npm-update-patch.md`).
- [x] 8.3 Resolve `{version}` (`target-of:<name>`, `max-target-of:<glob>`, `latest`) against the cross-project aggregated `proposedTarget` set.
- [x] 8.4 Raise exactly one `AskUserQuestion` per matched entry (across the run) with options `run-override` / `skip-matched` / `force-generic`. Record `OVERRIDE_ACTIONS` per entry id.
- [x] 8.5 Partition packages into `OVERRIDE_RUN`, `OVERRIDE_SKIP`, `GENERIC` subsets per project.

## 9. Confirmation gate

- [x] 9.1 Raise the apply-all / pick-subset / cancel `AskUserQuestion` once.
- [x] 9.2 For `pick-subset`, parse free-form input (split on comma + newline, trim, validate against the plan's package names; re-prompt on invalid input).
- [x] 9.3 Empty post-exclusion set → print `All updates excluded; nothing to apply.` and exit zero.
- [x] 9.4 `cancel` → print `Cancelled. No files modified.` and exit zero with no apply, no install, no override execution.

## 10. Sequential apply

- [x] 10.1 Iterate the resolved project set in registry insertion order.
- [x] 10.2 For each project, compute the per-project subset (post-policy, post-override, post-user-exclusion) and skip the project if empty.
- [x] 10.3 For each `package.json` `sourceFile` in the per-project subset: invoke `npm-check-updates@21.0.2` with `--target <target>`, `-p <pm>`, `--upgrade`, `--packageFile <sourceFile>`, and `--filter "<names>"` whenever the subset is strict.
- [x] 10.4 For `pnpm-workspace.yaml`: in-memory edit of matching `catalog:` keys, preserving formatting, comments, and key order. Do NOT touch consumer `package.json` `catalog:` references.
- [x] 10.5 Run override commands (in declaration order) for `OVERRIDE_RUN` entries that touch this project.
- [x] 10.6 Run exactly one `<pm> install` per project after all bumps and overrides land.
- [x] 10.7 On any failure (ncu, override, install): stop the entire run; do NOT attempt subsequent projects.
- [x] 10.8 Stream `ncu` and `<pm> install` stdout/stderr through to the user during apply.

## 11. Cross-project summary

- [x] 11.1 Render summary sections conditionally (Applied projects, Failed project, Pending projects, Skipped path missing, Skipped scan-failed, Skipped by user, Skipped by conflict policy, Skipped by override, Warnings).
- [x] 11.2 Always render the `Suggested next steps (not executed):` section with the three bullets.
- [x] 11.3 Verify the registry hash is byte-identical before and after the run (manual check noted in §13).

## 12. Command file

- [x] 12.1 Create `claude-plugins/experiments/commands/commander-update-patch.md` with YAML frontmatter (`description: <one-line>`).
- [x] 12.2 Document the invocation contract: no positional args, no flags, ARGUMENTS handling prints `commander-update-patch takes no arguments; ignoring: <verbatim>` and continues.
- [x] 12.3 Invoke the orchestrator skill with `level: "patch"`, `target: "patch"`, default `overrideRegistryPath`, no `projectsFilter`.
- [x] 12.4 Surface skill output verbatim — no wrapper messages, no extra prompts, no post-processing.

## 13. Plugin metadata

- [x] 13.1 Add `commander-update-patch.md` and the `commander-update-orchestrator` skill to `claude-plugins/experiments/README.md` under the appropriate sections.
- [x] 13.2 Bump the version in `claude-plugins/experiments/.claude-plugin/plugin.json` (patch). — **Deferred to release-please.** Per project policy (commit `3ea84bd feat(plugins)!: adopt claude-plugin-tag release flow`), plugin version files are bumped automatically by release-please from conventional commits (`feat(experiments): …` for this change). Manual edits skipped.
- [x] 13.3 Bump the version in `claude-plugins/experiments/package.json` to match. — **Deferred to release-please** (same reason as 13.2; release-please syncs all three files via `extra-files`).
- [x] 13.4 Bump the `experiments` entry version in `.claude-plugin/marketplace.json` to match. — **Deferred to release-please** (same reason as 13.2).
- [x] 13.5 Confirm all three files declare the same version string (manual diff). — N/A under release-please flow; the three files are synced atomically by the release PR.

## 14. Manual verification

- [ ] 14.1 With NO registry file (`<HOME>/.claude/commander/projects.json` missing): run `/experiments:commander-update-patch`. Expect empty-registry message; confirm no directory or file is created (`ls "<HOME>/.claude/commander/"` should fail).
- [ ] 14.2 With an empty registry (`{"version": 2, "projects": {}}`): run the command. Expect the same empty-registry message.
- [ ] 14.3 Register two projects via `/experiments:commander-add`, both with patch updates available. Run the command. Expect: project picker → plan table with cross-project bumps → apply-all → both projects updated, one install per project.
- [ ] 14.4 Register two projects where one project's path no longer exists on disk. Run the command. Expect: missing-path project skipped with warning, other project applied normally; summary lists `Skipped (path missing)`.
- [ ] 14.5 Register two projects with the same package at different patch targets, where both ranges admit the max. Run the command. Expect: no conflict prompt, both projects bump to the same `proposedTarget`.
- [ ] 14.6 Register two projects with the same package at different patch targets, where one range does NOT admit the max. Run the command. Expect: one conflict prompt; verify each policy option (`use-max-where-possible`, `per-project`, `skip-package`) produces the expected per-project bumps.
- [ ] 14.7 Register two projects, both with Storybook updates. Run the command. Expect: exactly one override prompt covering both projects' Storybook packages; selecting `run-override` executes the upgrade command once and skips ncu for those packages in both projects.
- [ ] 14.8 Trigger a scan failure in one of two projects (e.g., delete the project's `package.json`). Run the command. Expect: that project marked `scan-failed` in the summary, other project applied normally.
- [ ] 14.9 Cause an apply failure on the second of three projects (e.g., revoke write permission on a `package.json`). Run the command. Expect: project 1 applied, project 2 failed, project 3 listed as pending; summary partition is correct; on-disk state of project 3 is byte-identical to pre-run.
- [ ] 14.10 At the confirmation gate, select `cancel`. Confirm no manifest, lockfile, or registry entry is modified across any project (`shasum` before/after on every file in scope).
- [ ] 14.11 Run with `pick-subset` and exclude one package. Confirm the excluded package is in the summary's `Skipped by user` section and never appears in any project's diff.
- [ ] 14.12 Verify `<HOME>/.claude/commander/projects.json` is byte-identical before and after every run above (`shasum` checks).
- [ ] 14.13 Pass spurious arguments (`/experiments:commander-update-patch --foo`). Expect the "ignoring" notice followed by normal flow.

## 15. Validation & wrap-up

- [x] 15.1 Run `openspec validate add-commander-update-patch` → expect "is valid". ✅ `Change 'add-commander-update-patch' is valid`.
- [ ] 15.2 Run `openspec verify --change add-commander-update-patch` (or `/opsx:verify`) once implementation is complete.
- [ ] 15.3 Manual `git diff` review across all touched files; confirm no stray edits.

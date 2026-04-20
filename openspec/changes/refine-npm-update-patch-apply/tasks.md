## 1. Spikes

- [x] 1.1 Verify `ncu --filter "name1 name2 ..."` literal semantics against a fixture with regex-significant names (`@scope/foo`, `postcss-import`, `eslint-plugin-storybook`). Record in `research/ncu-filter-spike.md`: exact command, output, and whether ncu treats the list as literal or regex. Decide fallback if regex-parsed.
- [x] 1.2 Verify whether `ncu --target patch --upgrade --packageFile pnpm-workspace.yaml` rewrites `catalog:` entries in ncu 21.0.2. Record in `research/ncu-catalog-spike.md`. Confirm or refute Decision 4; if it works, note for a follow-up change.
- [x] 1.3 Verify `ncu --upgrade` preserves prefix semantics (`^`/`~`/exact) on a fixture manifest. Record exact before/after diff in the spike doc.
- [x] 1.4 Verify `ncu --cooldown <period>` behavior when combined with `--upgrade` (not just `--jsonUpgraded`). Confirm it honours the same filter. Record in `research/ncu-cooldown-apply-spike.md`.

## 2. Registry data file

- [x] 2.1 Create directory `claude-plugins/experiments/skills/scan-npm-updates/data/`
- [x] 2.2 Create `pkg-upgrade-overrides.yaml` with the Storybook seed entry per spec (`id`, `matches`, `command`, `versionSource`, `fallbackVersionSource`, `reference`, `notes`)
- [x] 2.3 Document the YAML shape at the top of the file as a YAML comment block (entry field meanings) so future contributors can add entries by reading the file alone

## 3. Command — update `npm-update-patch.md`

- [x] 3.1 Rewrite Step 6 ("Apply bumps") to invoke `ncu --target patch --upgrade --packageFile <path>` per `package.json` manifest, mirroring the scan's `--cooldown` flag when present
- [x] 3.2 In Step 6, handle `pick-subset` by appending `--filter "<space-separated accepted names>"` to each invocation
- [x] 3.3 Keep the existing in-memory edit path for `pnpm-workspace.yaml#catalog` entries; document that ncu does not handle catalogs (reference the spike doc)
- [x] 3.4 Insert a new Step 5.5 (between the primary `AskUserQuestion` and Step 6) that loads the registry YAML, computes matched entries against ACCEPTED, and for each matched entry asks `AskUserQuestion` with options `run-override` / `skip-matched` / `force-generic`
- [x] 3.5 Implement the three branches in Step 6: `run-override` (execute interpolated command once per entry, exclude matched packages from ncu --upgrade), `skip-matched` (exclude from everything), `force-generic` (treat as non-matched)
- [x] 3.6 Implement graceful degradation: missing/invalid YAML → warning + proceed as if no entries matched
- [x] 3.7 Implement version interpolation resolvers: `target-of:<name>`, `max-target-of:<glob>`, `latest`, with fallback behavior
- [x] 3.8 Implement first-win match ordering and the `*` glob semantics
- [x] 3.9 Update Step 7 (Install): skip the final `<pm> install` when every accepted package was handled by `run-override` and nothing else was written
- [x] 3.10 Update Step 8 (Summary) to distinguish "applied generically (ncu)", "applied via override", "skipped by override policy", and to print which override command(s) ran
- [x] 3.11 Update the "Hard rules" block if any rule changes (it shouldn't — tests/lint/build still off-limits)

## 4. Spec reconciliation

- [x] 4.1 Validate the delta with `openspec change validate refine-npm-update-patch-apply --strict`
- [ ] 4.2 After implementation, sync to main specs via `/opsx:sync` (or manual merge into `openspec/specs/experiments-plugin/spec.md`)
- [ ] 4.3 Verify the synced spec still passes `openspec spec validate experiments-plugin`

## 5. Plugin version bump

- [x] 5.1 Invoke `experiments:plugin-version-bump` skill; classify as minor (behavioral change in an existing command + new data artifact)
- [x] 5.2 Set `claude-plugins/experiments/.claude-plugin/plugin.json`, `claude-plugins/experiments/package.json`, and the `experiments` entry in `.claude-plugin/marketplace.json` to `0.7.0`
- [x] 5.3 Verify all three files report exactly `0.7.0`

## 6. Manual validation on monolab

- [x] 6.1 Run `/experiments:npm-update-patch` on this workspace; confirm detection unchanged, table renders as before
- [x] 6.2 Exercise `apply-all` and observe Step 6 runs `ncu --upgrade` per manifest (not per-entry Edit calls). Verify prefixes preserved by diffing `package.json` before/after
- [x] 6.3 Exercise `pick-subset` excluding one package; verify only the rest got bumped via `--filter`
- [ ] 6.4 Exercise `cancel`; verify zero file changes
- [ ] 6.5 Verify catalog entries in `pnpm-workspace.yaml` still get bumped correctly (existing path)

## 7. Manual validation on fixture with Storybook

- [ ] 7.1 Clone or scaffold a minimal project with `storybook` + `@storybook/react` at a version with a patch available (or synthesize via local registry)
- [ ] 7.2 Run `/experiments:npm-update-patch`; verify the registry-prompt fires with the Storybook entry
- [ ] 7.3 Choose `run-override`; verify `npx storybook@<v> upgrade` runs and the generic `ncu --upgrade` is NOT invoked for `@storybook/*`
- [ ] 7.4 Re-run; choose `skip-matched`; verify no storybook package is bumped and no override runs
- [ ] 7.5 Re-run; choose `force-generic`; verify storybook packages are bumped via `ncu --upgrade`

## 8. Documentation

- [x] 8.1 Update `claude-plugins/experiments/README.md` to mention the override registry and point at `skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml` as the extension point
- [x] 8.2 Add a section in `SKILL.md` of `scan-npm-updates` noting that the `data/` folder hosts command-side registries (not skill-read) so future contributors don't mis-read it as skill input
- [x] 8.3 Link GitHub issue #189 in the change folder's README (or leave the issue number in the proposal — already done)

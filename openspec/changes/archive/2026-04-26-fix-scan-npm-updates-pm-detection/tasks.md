## 1. Edit SKILL.md

- [x] 1.1 Open `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md`, "Tool invocation" section, and prepend `-p <pm>` to the documented ncu command (before `--target`). The `<pm>` token corresponds to the PM resolved in precondition 2.
- [x] 1.2 Add a brief note (≤3 lines) right below the command explaining why `-p` is mandatory: ncu 21.0.2 auto-detects `packageManager: 'deno'` when there is a `deno.json` sibling to `package.json`, which collapses `--dep` to `['imports']` and misses bumps. Reference the change `fix-scan-npm-updates-pm-detection`.
- [x] 1.3 Review the rest of `SKILL.md` to remove any wording suggesting "ncu detects the PM automatically"; make clear that the skill resolves the PM and passes it explicitly. — _No-op: the doc already attributes detection to the skill; grep with no hits._

## 2. Verify live

- [x] 2.1 From the repo root, run: `pnpm dlx npm-check-updates@21.0.2 -p pnpm --packageFile packages/react-clean/package.json --target patch --jsonUpgraded`. Confirm output `{"@types/react":"18.3.28","tsdown":"0.15.12"}` (or the bumps in effect on that date, respecting `minimumReleaseAge`).
- [x] 2.2 Run the same command with `--loglevel silly` and confirm that `Options` shows `packageManager: 'pnpm'` (not `'deno'`) and `dep: ['prod','dev','optional','packageManager']`.
- [x] 2.3 Re-run `/experiments:npm-update-patch` end-to-end in monolab; confirm that the scan table includes `@types/react` and `tsdown` for `packages/react-clean` and `packages/react-hooks`.

## 3. Cross-check scope

- [x] 3.1 Re-read proposal and design: confirm that no edit touches catalog post-processing, manifest enumeration, parsing, output shape, or consumers. The `SKILL.md` diff should be one effective line + the note.
- [x] 3.2 Confirm that `openspec/changes/refine-npm-update-patch-apply/research/followup-scan-deep-finding.md` already contains the "Spike follow-up (2026-04-24)" section pointing to this change (if not, add it).

## 4. OpenSpec validation & archive

- [x] 4.1 Run `openspec validate fix-scan-npm-updates-pm-detection` and resolve any errors (deltas, scenarios, capability paths).
- [x] 4.2 Conventional commit: `docs(openspec): propose fix-scan-npm-updates-pm-detection (seed npm-update-scanning spec)`.
- [x] 4.3 Commit the skill edit when implemented: `fix(skills): pass -p <pm> explicit to ncu in scan-npm-updates (avoid deno auto-detect)`.
- [x] 4.4 After merge, run `/opsx:archive fix-scan-npm-updates-pm-detection` (or equivalent) to move the delta to `openspec/specs/npm-update-scanning/spec.md`.

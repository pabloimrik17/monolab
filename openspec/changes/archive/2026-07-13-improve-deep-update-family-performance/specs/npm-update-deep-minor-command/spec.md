## MODIFIED Requirements

### Requirement: Execution prompt, bump delegation, and improvements

When the workflow finishes phase 4 (dossier synthesis) successfully, the command SHALL surface the dossier by path plus a bounded digest, then raise a single `AskUserQuestion` with `apply-all`, `apply-bumps-only`, `pick-subset`, `cancel` (same order as `npm-update-deep-patch`). For any path that applies bumps, the command SHALL delegate the bump mechanism to the `apply-npm-updates` skill (`target: "minor"`, generic-only — the deep path consults NO override registry, preserving the single-project deep divergence), with output redirected to on-disk logs per that skill's contract. Improvements SHALL be applied through the per-project changeset gate (apply-teammate reconnaissance → `changeset.md` → pre-gate check → orchestrator-owned human gate → teammate applies on approval, per the experiments-plugin gate requirements), scoped strictly to bullets present in `dossier.md`. On rejection, the command SHALL print `Improvements rejected at the changeset gate. No improvement edits applied; bumps are preserved.` and preserve applied bumps.

#### Scenario: Improvements go through the changeset gate

- **WHEN** the user selects `apply-all` after bumps land
- **THEN** the apply teammate writes `changeset.md` before any improvement `Edit`/`Write`
- **AND** on approval the teammate (not the main agent) applies the edits

#### Scenario: Gate rejection preserves bumps

- **WHEN** the user rejects the changeset at the gate
- **THEN** the command prints the rejection line and the already-applied bumps are NOT reverted

### Requirement: Final summary, changelog plan section, and hard rules

The command SHALL print a summary headed `## npm-update-deep-minor summary` with the same conditional sections as `npm-update-deep-patch` (applied bumps, applied improvements, skipped improvements, skipped-or-unavailable groups, install line, always-present `Suggested next steps`). The `dossier.md` produced by `parallel-research-workflow` SHALL include the script-assembled `## Changelogs` chronology section; the command references the dossier by path and SHALL NOT reproduce the chronology bodies in the conversation. The command SHALL delegate end-of-flow cleanup to the workflow (one `delete-plan` / `keep-plan` prompt). The command SHALL NOT create commits, push, or open PRs autonomously — it stops for human-in-the-loop review before any such outward/VCS action; SHALL NOT consult the override registry; and SHALL NOT mutate `catalog:` consumer `package.json` entries.

#### Scenario: Dossier includes the changelog section

- **WHEN** the workflow produces `dossier.md` for a minor run
- **THEN** `dossier.md` includes a `## Changelogs` section (per the `parallel-research-workflow` spec)
- **AND** the command references it by path rather than reproducing its bodies in the conversation

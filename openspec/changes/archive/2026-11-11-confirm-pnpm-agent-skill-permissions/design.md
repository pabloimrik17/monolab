## Context

See `proposal.md` for motivation. pnpm 12.14.0 is installed and pinned in `package.json`. Commit `79ce1c1` already added both skill grants. The baseline frozen install passed for 26 projects without pending approvals; `pnpm permissions list` reports both skills granted and eight independent build denials.

The bundled skills resolve through `.agents/skills/pnpm-fallow-fallow` to fallow 3.31.0 and `.agents/skills/pnpm-varlock-varlock` to varlock 1.21.0. The existing `pnpm-install-hardening` spec covers release age, exotic subdependencies, trust downgrade protection and strict builds, but not skill decisions. Its requirements remain compatible with this additive delta.

## Goals / Non-Goals

**Goals:** Preserve narrowly scoped grants, document the reviewed behavior, and validate using the real package manager.

**Non-Goals:** Upgrade dependencies, authorize build scripts, modify bundled skill instructions, introduce a new permission manager, or change application code and exports.

## Decisions

1. **Retain both skill grants.** Fallow documents dry-run before fixes and forbids agent-enabled telemetry. Varlock documents redacted validation and prohibits reading or editing local secret files. Their instructions are useful for dependencies already in this workspace. Denial would remove their pnpm-managed availability without removing the packages; no reviewed content justifies that choice here. The user's follow-up requests a proposal after this recommendation; this workflow does not apply changes.
2. **Use the existing YAML entries, accepting a no-op.** If an entry needs reconciliation during apply, edit only its `skills` value. Avoid `pnpm approve <package>` for already-decided packages: local help and [official CLI documentation](https://pnpm.io/cli/permissions) say named packages may be decided for every capability. The [official settings reference](https://github.com/pnpm/pnpm.io/blob/main/docs/settings/build.md) distinguishes `skills` from `build` and records denial with `false`.
3. **Validate behavior directly.** Run `pnpm permissions list`, `pnpm install --frozen-lockfile`, and inspect the diff. No new automated tests or Nx target are needed for this configuration confirmation; package installation itself exercises the affected behavior. Application tests and export validation are not relevant because no runtime code or exports change.
4. **Keep durable evidence in shared Beads.** Use `agentic-task-0fg5` in the existing shared database, recording the decision, versions, worktree, AoE session and validation. Do not initialize another database or commit repository files.

## Risks / Trade-offs

- Package-wide grants also cover future bundled skill revisions → review skill changes during dependency upgrades; this review covers the installed versions, not future content.
- Skills influence agent behavior and include mutating workflows → skill availability remains subordinate to the user's task authorization and repository instructions.
- Varlock relies on sensitivity annotations for redaction → granting the skill does not itself guarantee that all configuration is correctly classified.
- Existing OpenSpec configuration contains an unknown `delta-spec` rule key → leave unrelated configuration unchanged; honor applicable `specs` and `tasks` rules.

## Migration Plan

On a subsequent apply request, reconcile only the two skill entries if needed, run the direct validation, and record completion in shared Beads. No migration is expected because the desired values already exist. A future user decision to revoke either skill can set that package's `skills` to `false` and rerun installation, preserving build policy. Sync/archive the delta through the normal OpenSpec workflow when requested.

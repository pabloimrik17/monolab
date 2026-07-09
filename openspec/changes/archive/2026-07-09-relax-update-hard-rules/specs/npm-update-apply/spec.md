## MODIFIED Requirements

### Requirement: Hard rules

The skill SHALL preserve the family hard rules:

- SHALL NOT create commits, push, or open pull requests autonomously; the skill stops for human-in-the-loop review before any such outward/VCS action (opt-in isolation branch/worktree creation via `update-isolation` is permitted).
- SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only the catalog source file: `pnpm-workspace.yaml` for pnpm, the root `package.json` `catalog`/`catalogs.<name>` map for Bun.
- SHALL NOT run `ncu --upgrade` as a fallback after an override command fails.
- SHALL NOT read or write the override registry data file except via the read-only resolution procedure.

#### Scenario: No autonomous commit/push/PR

- **WHEN** an apply completes
- **THEN** no `git commit`, `git push`, or pull-request-creation command has been invoked by the skill

#### Scenario: No ncu fallback after override failure

- **WHEN** an override command fails
- **THEN** the skill SHALL NOT invoke `ncu --upgrade` for the matched packages

#### Scenario: Catalog source edited, consumer reference preserved (both PMs)

- **WHEN** the skill applies a catalog bump for a pnpm or bun catalog
- **THEN** only the catalog source file is edited and every consumer `catalog:*` reference is left untouched

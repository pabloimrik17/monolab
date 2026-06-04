## MODIFIED Requirements

### Requirement: Bump application reuses existing infrastructure

For `apply-all`, `apply-bumps-only`, and `pick-subset` (when bumps are included), the command SHALL apply patch-level bumps by invoking the `npm-update-apply` skill (the single source of truth for the single-project apply mechanism) with `target: "patch"`. The command SHALL build the resolved apply spec from the accepted set — `package.json` manifests as `manifestBumps` (with `includeFilter` set when the accepted set for a file is a strict subset, i.e. `pick-subset` partial inclusion) and `pnpm-workspace.yaml#catalog` entries as `catalogEdits` — and SHALL pass an empty `overrideCommands` set: the deep path consults NO override registry (the override flow remains the shallow `/experiments:npm-update-patch` path's responsibility). The skill runs `npm-check-updates@21.0.2` per manifest, performs the in-memory catalog edits, and runs exactly one install at the end; the command SHALL NOT restate that recipe inline.

#### Scenario: Bumps delegated to npm-update-apply

- **WHEN** the package manager is pnpm and 12 bumps are applied across 3 manifests
- **THEN** the command invokes `npm-update-apply` once with `target: "patch"`, which runs `pnpm install` exactly once after all manifests are written
- **AND** the command does not invoke `npm-check-updates` directly

#### Scenario: Catalog entries handled in-memory via the apply spec

- **WHEN** an update has `sourceFile: "pnpm-workspace.yaml"`
- **THEN** the command passes it as a `catalogEdits` entry to `npm-update-apply`, which edits the `catalog:` block in place and does NOT invoke `npm-check-updates` for that file

#### Scenario: Deep path passes no overrides

- **WHEN** the command builds the apply spec
- **THEN** `overrideCommands` is empty and no override registry is loaded (the deep single-project path does not consult overrides)

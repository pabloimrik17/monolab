## Why

Step 6 ("Apply bumps") of the `/experiments:npm-update-patch` command edits `package.json` entry by entry with sequential `Edit` calls. It is slow, fragile against prefixes (`^`/`~`/exact) and trailing commas, and burns context. In parallel, packages like Storybook publish their own upgrade command (`storybook upgrade`) that syncs the whole `@storybook/*` family and runs automigrations; bumping manifest by manifest misaligns them.

Origin issue: GitHub monolab#189 (two independent but co-located improvements in the apply phase, hence bundled into a single change).

## What Changes

- **MODIFIED**: Step 6 of the command delegates the `package.json` rewrite to a single `ncu --target patch --upgrade --packageFile <manifest>` invocation per file. For `pick-subset`, `--filter "name1 name2 ..."` is added (literal list, after a spike confirming the semantics). The cooldown/minimumReleaseAge flags resolved in the scan are mirrored in the apply to avoid ncu→ncu drift.
- **NEW**: a "package upgrade overrides" registry at `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`. First entry: Storybook (`storybook`, `@storybook/*`, `eslint-plugin-storybook`, `storybook-addon-*`) with template `npx storybook@{version} upgrade`. Trivially extensible format (add an entry without touching the command logic).
- **NEW**: before applying, if `ACCEPTED` contains packages that match a registry entry, the command raises an `AskUserQuestion` with options `run-override` / `skip-matched` / `force-generic`. Explicit decision per invocation; a migration is never auto-executed.
- **KEPT**: `pnpm-workspace.yaml#catalog` entries are still edited via the current in-memory path (ncu 21.x does not rewrite catalogs; a spike confirms this before freezing the decision).
- Bump of the `experiments` plugin: 0.6.0 → 0.7.0 (command behavior change + new data artifact).

No breaking changes at the interface level: same primary options (`apply-all | pick-subset | cancel`), same observable result in the working tree for packages outside the registry.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `experiments-plugin`: rewrites the "npm-update-patch Command" Requirement (replaces the apply section and adds the override-registry flow), and adds a "Package Upgrade Override Registry" Requirement that encodes the data file format and its semantics. The plugin version bump is applied via the `plugin-version-bump` skill and is not encoded as a Requirement.

## Impact

- Code: edits `claude-plugins/experiments/commands/npm-update-patch.md` (Step 6 + new registry-prompt phase). New file `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml` with the Storybook seed. Bump in `plugin.json`, `package.json` and the `marketplace.json` entry.
- Deps: no new npm dep in the workspace. `npm-check-updates@21.0.2` is already invoked via dlx in the skill; now also in the apply phase.
- External surface: same command interface; a new interactive question appears only when there are registry packages in the accepted set.
- No breaking changes.

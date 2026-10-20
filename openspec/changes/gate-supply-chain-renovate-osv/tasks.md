# Tasks

## 1. renovate.json

- [x] 1.1 Add `"osvVulnerabilityAlerts": true`; verify with `pnpm dlx --package renovate@<pinned in renovate-config-validator.yml> renovate-config-validator --strict renovate.json` (if the pinned version rejects the key, bump the pin in the workflow)
- [x] 1.2 Replace the unscoped npm 14-day rule with the major/minor-scoped rule and add the patch 3-day rule (descriptions per design.md); verify `git diff renovate.json` shows only those packageRules changes
- [x] 1.3 Verify effective ages (npm major/minor 14d; npm patch, docker patch 3d; npm pin/replacement/lockfileUpdate none; vuln fix none) by resolving presets and applying packageRules with a local Renovate, and confirm the validator passes in strict mode

## 2. pnpm-workspace.yaml

- [x] 2.1 Add `trustPolicy: no-downgrade` and `strictDepBuilds: true` next to `blockExoticSubdeps`; verify `pnpm install --frozen-lockfile` passes on a clean `node_modules`
- [x] 2.2 Confirm invariant: smallest Renovate age (3 days) ≥ `minimumReleaseAge: 1440`; verify by reading both files

## 3. Integration

- [x] 3.1 Run `openspec validate gate-supply-chain-renovate-osv --strict` and the repo's format/lint checks on the touched files (prettier `--tab-width 4` for JSON/YAML)
- [ ] 3.2 Open PR against `develop` with a conventional title (`fix(renovate): gate supply chain with OSV alerts and release ages`) justified on its own merits; verify CI is green

## Workflow follow-up

- Archive the change after the PR merges.

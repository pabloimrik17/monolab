# Tasks

## 1. Verify the requirement against PR #415

- [ ] 1.1 Run `renovate-config-validator --strict renovate.json` with the pinned Renovate version and verify it exits zero
- [ ] 1.2 Run Renovate extraction (`--platform=local --dry-run=extract`) and verify it reports `renovate` from both `.github/workflows/renovate-config-validator.yml` and `lint-staged.config.ts`
- [ ] 1.3 Run `openspec validate align-renovate-validator-pnpx-managers --strict` and verify it passes

## Workflow follow-up

- Archive this change after PR #415 merges; archiving applies the delta to `openspec/specs/renovate-config-validation/spec.md`.

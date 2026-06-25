## 1. Workflow update

- [x] 1.1 Replace line 43 in `.github/workflows/ci.yml`, `uses: nrwl/nx-set-shas@v4`, with `uses: nrwl/nx-set-shas@afb73a62d26e41464e9254689e1fd6122ee683c1 # v5.0.1`
- [x] 1.2 Verify the YAML indentation is preserved (4 spaces) and that there are no other uses of `nrwl/nx-set-shas` in `.github/workflows/`
- [x] 1.3 Pin the remaining actions in `.github/workflows/ci.yml` to SHA + `# vX.Y.Z`: `actions/checkout` (v4.3.1), `pnpm/action-setup` (v4.4.0), `actions/setup-node` (v4.4.0), `actions/cache/{restore,save}` (v4.3.0), `actions/upload-artifact` (v4.6.2), `codecov/codecov-action` (v5.5.4), `codecov/test-results-action` (v1.2.1)
- [x] 1.4 Pin the actions in `.github/workflows/release-please.yml` to SHA + `# vX.Y.Z`: `googleapis/release-please-action` (v4.4.1), `actions/checkout` (v4.3.1), `pnpm/action-setup` (v4.4.0), `actions/setup-node` (v4.4.0), `denoland/setup-deno` (v2.0.4)
- [x] 1.5 Verify that `grep -nE 'uses: [^@]+@v[0-9]+(\.[0-9]+)?(\.[0-9]+)?$' .github/workflows/*.yml` returns no matches (zero mutable tags remaining)

## 2. Renovate config

- [x] 2.1 In `renovate.json`, add `"helpers:pinGitHubActionDigestsToSemver"` to the `extends` array (after `:enableVulnerabilityAlertsWithLabel(security)`)
- [x] 2.2 Validate the JSON (no trailing commas, correct schema): `pnpm dlx --package=renovate -- renovate-config-validator renovate.json` or equivalent
- [x] 2.3 Confirm that the existing `customManagers` and `packageRules` still apply (the preset only affects the `github-actions` manager)

## 3. Verification

- [x] 3.1 Push branch and open a draft PR against `develop`
- [x] 3.2 Verify the `Set Nx SHA` step completes successfully in CI (logs show `NX_BASE`/`NX_HEAD` exported)
- [x] 3.3 Verify the rest of the pipeline passes (lint, test, build) without regressions
- [x] 3.4 Validate the change artifacts: `pnpm dlx @fission-ai/openspec@1.2.0 validate --changes --no-interactive`

## 1. Renovate preset migration (`renovate.json`)

- [x] 1.1 Replace `config:recommended` with `config:best-practices` as the base preset in `extends`
- [x] 1.2 Remove explicit `helpers:pinGitHubActionDigestsToSemver` from `extends` (now transitive via `config:best-practices`)
- [x] 1.3 Remove explicit top-level `configMigration: true` (set by `config:best-practices`)
- [x] 1.4 Keep `:dependencyDashboard`, `:semanticCommits`, `:enableVulnerabilityAlertsWithLabel(security)`, `rangeStrategy: "pin"`, `baseBranchPatterns`, `reviewers`, `labels`, `timezone`, and existing `packageRules`/`customManagers` (customManagers migrated `fileMatch` → `managerFilePatterns` for Renovate 43 — behavior preserved)

## 2. Hardening presets & vulnerability throttling

- [x] 2.1 Add `security:openssf-scorecard`, `docker:enableMajor`, `customManagers:githubActionsVersions`, `customManagers:dockerfileVersions`, `:maintainLockFilesWeekly` to `extends`
- [x] 2.2 Confirm `:enablePreCommit` is NOT added (no `.pre-commit-config.yaml`; documented decision)
- [x] 2.3 Add `vulnerabilityAlerts: { "prHourlyLimit": 0, "prConcurrentLimit": 0 }`; leave top-level `prHourlyLimit: 2` / `prConcurrentLimit: 10` intact

## 3. Preserve 14-day npm release-age floor

- [x] 3.1 After adopting `config:best-practices` (brings `security:minimumReleaseAgeNpm`), verify the effective npm `minimumReleaseAge` is still ≥ 14 days
- [x] 3.2 Append a trailing `packageRule` (`matchDatasources: ["npm"]`, `minimumReleaseAge: "14 days"`) to re-assert the floor

## 4. Validator custom manager

- [x] 4.1 Add a regex custom manager matching the pinned-validator invocation; adapted to `pnpm dlx --package <pkg>@<ver>` (the `-p` shorthand is mis-parsed by pnpm dlx and runs the main bot)
- [x] 4.2 Set its file scope via `managerFilePatterns` (Renovate 43 replaces `fileMatch`) to `["/^\\.github/workflows/.+\\.ya?ml$/", "/^lint-staged\\.config\\.ts$/"]`
- [x] 4.3 Keep the existing `pnpm dlx|bunx|npx <pkg>@<ver>` custom manager (migrated to `managerFilePatterns`)

## 5. CI validator workflow

- [x] 5.1 Resolve the pinned `renovate` version: `43.220.0` (last release on pnpm ^10; `>= 43.221.0` requires pnpm 11) + `allowedVersions: "<43.221.0"` cap in `renovate.json`
- [x] 5.2 Add `.github/workflows/renovate-config-validator.yml` triggered on `pull_request` with a `paths` filter over `renovate.json`, `renovate.json5`, `.renovaterc*`, `.github/renovate.json*`
- [x] 5.3 Job runs `pnpm dlx --package renovate@43.220.0 renovate-config-validator --strict renovate.json`; SHA-pinned `actions/checkout`, `pnpm/action-setup`, `actions/setup-node` with `# vX.Y.Z` comments (per `ci-github-actions-pinning`)

## 6. Pre-commit validator (Husky/lint-staged)

- [x] 6.1 Add an entry in `lint-staged.config.ts` keyed to `"renovate.json"` running `pnpm dlx --package renovate@43.220.0 renovate-config-validator --strict renovate.json`, ignoring passed filenames
- [x] 6.2 Entry scoped to `renovate.json` only (literal glob → does not fire for unrelated files); no `.pre-commit-config.yaml` introduced

## 7. Validation & verification

- [x] 7.1 Ran `pnpm dlx --package renovate@43.220.0 renovate-config-validator --strict renovate.json` locally → "Config validated successfully" (exit 0); migrated `fileMatch` → `managerFilePatterns` to clear the `--strict` migration error
- [x] 7.2 Verified the lint-staged validator entry is scoped to `renovate.json` (literal glob); end-to-end firing confirmed by the pre-commit hook at commit time
- [x] 7.3 `eslint lint-staged.config.ts --max-warnings=40` → clean (exit 0)
- [x] 7.4 Opened PR #242 against `develop`; the `validate` (renovate-config-validator) workflow ran green
- [x] 7.5 Walked the issue #204 acceptance-criteria checklist (see apply summary; prek→Husky and `:enablePreCommit` omission are approved deviations; "Renovate cycle succeeds" + PR-green are runtime/PR-time checks)

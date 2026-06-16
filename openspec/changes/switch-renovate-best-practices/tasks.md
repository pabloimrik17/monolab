## 1. Renovate preset migration (`renovate.json`)

- [ ] 1.1 Replace `config:recommended` with `config:best-practices` as the base preset in `extends`
- [ ] 1.2 Remove explicit `helpers:pinGitHubActionDigestsToSemver` from `extends` (now transitive via `config:best-practices`)
- [ ] 1.3 Remove explicit top-level `configMigration: true` (set by `config:best-practices`)
- [ ] 1.4 Keep `:dependencyDashboard`, `:semanticCommits`, `:enableVulnerabilityAlertsWithLabel(security)`, `rangeStrategy: "pin"`, `baseBranchPatterns`, `reviewers`, `labels`, `timezone`, and existing `packageRules`/`customManagers`

## 2. Hardening presets & vulnerability throttling

- [ ] 2.1 Add `security:openssf-scorecard`, `docker:enableMajor`, `customManagers:githubActionsVersions`, `customManagers:dockerfileVersions`, `:maintainLockFilesWeekly` to `extends`
- [ ] 2.2 Confirm `:enablePreCommit` is NOT added (no `.pre-commit-config.yaml`; documented decision)
- [ ] 2.3 Add `vulnerabilityAlerts: { "prHourlyLimit": 0, "prConcurrentLimit": 0 }`; leave top-level `prHourlyLimit: 2` / `prConcurrentLimit: 10` intact

## 3. Preserve 14-day npm release-age floor

- [ ] 3.1 After adopting `config:best-practices` (brings `security:minimumReleaseAgeNpm` = 3 days), verify the effective npm `minimumReleaseAge` is still ≥ 14 days
- [ ] 3.2 If lowered, append a trailing `packageRule` (`matchDatasources: ["npm"]`, `minimumReleaseAge: "14 days"`) to re-assert the floor

## 4. Validator custom manager

- [ ] 4.1 Add a regex custom manager matching `pnpm dlx -p (?<depName>(?:@[^/\s]+/)?[^@\s]+)@(?<currentValue>[^\s]+)` with `datasourceTemplate: "npm"`
- [ ] 4.2 Set its `fileMatch` to `["^\\.github/workflows/.+\\.ya?ml$", "^lint-staged\\.config\\.ts$"]`
- [ ] 4.3 Keep the existing `pnpm dlx|bunx|npx <pkg>@<ver>` custom manager unchanged

## 5. CI validator workflow

- [ ] 5.1 Resolve the current stable `renovate` version to pin (replace illustrative `40.0.0`)
- [ ] 5.2 Add `.github/workflows/renovate-config-validator.yml` triggered on `pull_request` with a `paths` filter over `renovate.json`, `renovate.json5`, `.renovaterc*`, `.github/renovate.json*`
- [ ] 5.3 Job runs `pnpm dlx -p renovate@<ver> renovate-config-validator --strict`; SHA-pin `actions/checkout` and `pnpm/action-setup` with `# vX.Y.Z` comments (per `ci-github-actions-pinning`)

## 6. Pre-commit validator (Husky/lint-staged)

- [ ] 6.1 Add an entry in `lint-staged.config.ts` keyed to the Renovate config path (e.g. `"renovate.json"`) running `pnpm dlx -p renovate@<ver> renovate-config-validator --strict` with the same pinned version, ignoring passed filenames
- [ ] 6.2 Confirm the entry does NOT run for unrelated staged files and that no `.pre-commit-config.yaml` is introduced

## 7. Validation & verification

- [ ] 7.1 Run `pnpm dlx -p renovate@<ver> renovate-config-validator --strict renovate.json` locally; fix any reported errors
- [ ] 7.2 Stage only `renovate.json` and confirm the lint-staged validator entry fires (and that staging an unrelated file does not trigger it)
- [ ] 7.3 Run `nx run-many -t lint:eslint` (or `nx affected -t lint:eslint`) to confirm the edited `lint-staged.config.ts` lints clean
- [ ] 7.4 Open the PR against `develop` and confirm the new validator workflow runs green
- [ ] 7.5 Walk the issue #204 acceptance-criteria checklist and confirm each item is satisfied

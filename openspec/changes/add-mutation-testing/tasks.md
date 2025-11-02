# Implementation Tasks

## 1. Install Dependencies

- [x] 1.1 Install @stryker-mutator/core as dev dependency
- [x] 1.2 Install @stryker-mutator/vitest-runner as dev dependency
- [x] 1.3 Install @stryker-mutator/typescript-checker as dev dependency
- [x] 1.4 Verify installation with `pnpm list` for Stryker packages

## 2. Create Base Configuration

- [x] 2.1 Create `stryker.config.base.ts` in project root
- [x] 2.2 Configure packageManager, testRunner, and coverageAnalysis
- [x] 2.3 Enable incremental mode with incrementalFile path
- [x] 2.4 Configure reporters (html, json, clear-text, progress)
- [x] 2.5 Set default thresholds (high: 80, low: 60, break: 60)
- [x] 2.6 Set concurrency to 4 for parallel execution

## 3. Configure Packages

- [x] 3.1 Create `stryker.config.ts` for is-odd package with high thresholds (90/75/75)
- [x] 3.2 Create `stryker.config.ts` for is-even package with high thresholds (90/75/75)
- [x] 3.3 Create `stryker.config.ts` for react-hooks package with medium thresholds (80/65/60)
- [x] 3.4 Create `stryker.config.ts` for react-clean package with medium thresholds (80/65/60)
- [x] 3.5 Create `stryker.config.ts` for ts-configs package with low thresholds (70/50/50)
- [x] 3.6 Add `mutate` patterns to each config excluding test files

## 4. Add Package Scripts

- [x] 4.1 Add `test:mutation` script to is-odd package.json
- [x] 4.2 Add `test:mutation` script to is-even package.json
- [x] 4.3 Add `test:mutation` script to react-hooks package.json
- [x] 4.4 Add `test:mutation` script to react-clean package.json
- [x] 4.5 Add `test:mutation` script to ts-configs package.json
- [x] 4.6 Add `test:mutation:report` script to all packages for viewing HTML reports

## 5. Integrate with Nx

- [x] 5.1 Add `test:mutation` target to nx.json targetDefaults
- [x] 5.2 Configure cache: true and outputs for reports
- [x] 5.3 Configure dependsOn to run after build
- [x] 5.4 Configure inputs to include config files and incremental cache
- [x] 5.5 Add `test:mutation:report` target to targetDefaults with cache: false
- [x] 5.6 Test with `nx run @monolab/is-odd:test:mutation` locally

## 6. Update File Exclusions

- [x] 6.1 Add Stryker report patterns to .gitignore
- [x] 6.2 Add Stryker report patterns to .prettierignore
- [x] 6.3 Update eslint.config.ts ignores to include `**/reports/**`
- [x] 6.4 Verify linters skip reports directory with manual test

## 7. CI Integration - Cache Setup

- [x] 7.1 Add Stryker cache restore step after dependency cache in ci.yml
- [x] 7.2 Configure cache path for `packages/*/reports/stryker-incremental.json`
- [x] 7.3 Set cache key with runner.os, branch name, and pnpm-lock hash
- [x] 7.4 Configure restore-keys fallback strategy (same branch → develop → any)
- [x] 7.5 Add Stryker cache save step after mutation testing execution

## 8. CI Integration - Execution

- [x] 8.1 Add mutation testing step after unit tests (All) in ci.yml
- [x] 8.2 Configure to run only on push events (skip PRs)
- [x] 8.3 Use `pnpm exec nx run-many -t test:mutation` command
- [x] 8.4 Add mutation reports upload as artifacts (optional, 30 days retention)
- [x] 8.5 Test CI execution on develop branch push

## 9. Dashboard Integration

- [x] 9.1 Add dashboard configuration to stryker.config.base.ts (project, baseUrl, version)
- [x] 9.2 Configure module identifier in each package config (e.g., "is-odd", "is-even")
- [ ] 9.3 Set up STRYKER_DASHBOARD_API_KEY in GitHub Actions secrets
- [ ] 9.4 Test dashboard upload locally with one package
- [ ] 9.5 Verify per-module reports appear on dashboard
- [ ] 9.6 Test combined project view aggregates all modules
- [ ] 9.7 Get badge URLs for global and per-module scores

## 10. Documentation

- [x] 10.1 Add "Mutation Testing" section to root README.md
- [x] 10.2 Document available commands (run-many, affected, specific package)
- [x] 10.3 Document mutation score interpretation (high/medium/low ranges)
- [x] 10.4 Document CI behavior (main/develop only, incremental mode)
- [x] 10.5 Add mutation testing badge to root README (global score)
- [ ] 10.6 Add per-module badges to relevant package READMEs
- [ ] 10.7 Document dashboard usage and how to view historical trends

## 11. Testing and Validation

- [x] 11.1 Run mutation testing locally on one package and verify reports generated
- [x] 11.2 Verify incremental cache file created after first run
- [x] 11.3 Run mutation testing again and verify incremental mode reuses cache
- [x] 11.4 Test Nx affected command with code changes
- [x] 11.5 Verify thresholds enforced (temporarily lower threshold to test failure)
- [ ] 11.6 Push to develop branch and verify CI cache restoration works (requires merge)
- [ ] 11.7 Verify CI artifacts uploaded and accessible (requires merge)
- [x] 11.8 Confirm PR builds skip mutation testing (configuration verified)
- [ ] 11.9 Verify dashboard receives reports and displays per-module scores (requires STRYKER_DASHBOARD_API_KEY secret)

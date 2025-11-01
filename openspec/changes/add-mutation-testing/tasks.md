# Implementation Tasks

## 1. Install Dependencies

- [ ] 1.1 Install @stryker-mutator/core as dev dependency
- [ ] 1.2 Install @stryker-mutator/vitest-runner as dev dependency
- [ ] 1.3 Install @stryker-mutator/typescript-checker as dev dependency
- [ ] 1.4 Verify installation with `pnpm list` for Stryker packages

## 2. Create Base Configuration

- [ ] 2.1 Create `stryker.config.base.ts` in project root
- [ ] 2.2 Configure packageManager, testRunner, and coverageAnalysis
- [ ] 2.3 Enable incremental mode with incrementalFile path
- [ ] 2.4 Configure reporters (html, json, clear-text, progress)
- [ ] 2.5 Set default thresholds (high: 80, low: 60, break: 60)
- [ ] 2.6 Set concurrency to 4 for parallel execution

## 3. Configure Packages

- [ ] 3.1 Create `stryker.config.ts` for is-odd package with high thresholds (90/75/75)
- [ ] 3.2 Create `stryker.config.ts` for is-even package with high thresholds (90/75/75)
- [ ] 3.3 Create `stryker.config.ts` for react-hooks package with medium thresholds (80/65/60)
- [ ] 3.4 Create `stryker.config.ts` for react-clean package with medium thresholds (80/65/60)
- [ ] 3.5 Create `stryker.config.ts` for ts-configs package with low thresholds (70/50/50)
- [ ] 3.6 Add `mutate` patterns to each config excluding test files

## 4. Add Package Scripts

- [ ] 4.1 Add `test:mutation` script to is-odd package.json
- [ ] 4.2 Add `test:mutation` script to is-even package.json
- [ ] 4.3 Add `test:mutation` script to react-hooks package.json
- [ ] 4.4 Add `test:mutation` script to react-clean package.json
- [ ] 4.5 Add `test:mutation` script to ts-configs package.json
- [ ] 4.6 Add `test:mutation:report` script to all packages for viewing HTML reports

## 5. Integrate with Nx

- [ ] 5.1 Add `test:mutation` target to nx.json targetDefaults
- [ ] 5.2 Configure cache: true and outputs for reports
- [ ] 5.3 Configure dependsOn to run after build
- [ ] 5.4 Configure inputs to include config files and incremental cache
- [ ] 5.5 Add `test:mutation:report` target to targetDefaults with cache: false
- [ ] 5.6 Test with `nx run @monolab/is-odd:test:mutation` locally

## 6. Update File Exclusions

- [ ] 6.1 Add Stryker report patterns to .gitignore
- [ ] 6.2 Add Stryker report patterns to .prettierignore
- [ ] 6.3 Update eslint.config.ts ignores to include `**/reports/**`
- [ ] 6.4 Verify linters skip reports directory with manual test

## 7. CI Integration - Cache Setup

- [ ] 7.1 Add Stryker cache restore step after dependency cache in ci.yml
- [ ] 7.2 Configure cache path for `packages/*/reports/stryker-incremental.json`
- [ ] 7.3 Set cache key with runner.os, branch name, and pnpm-lock hash
- [ ] 7.4 Configure restore-keys fallback strategy (same branch → develop → any)
- [ ] 7.5 Add Stryker cache save step after mutation testing execution

## 8. CI Integration - Execution

- [ ] 8.1 Add mutation testing step after unit tests (All) in ci.yml
- [ ] 8.2 Configure to run only on push events (skip PRs)
- [ ] 8.3 Use `pnpm exec nx run-many -t test:mutation` command
- [ ] 8.4 Add mutation reports upload as artifacts (optional, 30 days retention)
- [ ] 8.5 Test CI execution on develop branch push

## 9. Dashboard Integration

- [ ] 9.1 Add dashboard configuration to stryker.config.base.ts (project, baseUrl, version)
- [ ] 9.2 Configure module identifier in each package config (e.g., "is-odd", "is-even")
- [ ] 9.3 Set up STRYKER_DASHBOARD_API_KEY in GitHub Actions secrets
- [ ] 9.4 Test dashboard upload locally with one package
- [ ] 9.5 Verify per-module reports appear on dashboard
- [ ] 9.6 Test combined project view aggregates all modules
- [ ] 9.7 Get badge URLs for global and per-module scores

## 10. Documentation

- [ ] 10.1 Add "Mutation Testing" section to root README.md
- [ ] 10.2 Document available commands (run-many, affected, specific package)
- [ ] 10.3 Document mutation score interpretation (high/medium/low ranges)
- [ ] 10.4 Document CI behavior (main/develop only, incremental mode)
- [ ] 10.5 Add mutation testing badge to root README (global score)
- [ ] 10.6 Add per-module badges to relevant package READMEs
- [ ] 10.7 Document dashboard usage and how to view historical trends

## 11. Testing and Validation

- [ ] 11.1 Run mutation testing locally on one package and verify reports generated
- [ ] 11.2 Verify incremental cache file created after first run
- [ ] 11.3 Run mutation testing again and verify incremental mode reuses cache
- [ ] 11.4 Test Nx affected command with code changes
- [ ] 11.5 Verify thresholds enforced (temporarily lower threshold to test failure)
- [ ] 11.6 Push to develop branch and verify CI cache restoration works
- [ ] 11.7 Verify CI artifacts uploaded and accessible
- [ ] 11.8 Confirm PR builds skip mutation testing
- [ ] 11.9 Verify dashboard receives reports and displays per-module scores

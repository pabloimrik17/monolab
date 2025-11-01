# Implementation Tasks: Enhanced Vitest Testing

## 1. Dependencies and Setup

- [ ] 1.1 Install browser testing dependencies: `pnpm add -D @vitest/browser vitest-browser-react playwright -w`
- [ ] 1.2 Verify @vitest/ui already installed (should be present in catalog)
- [ ] 1.3 Run Playwright install: `pnpm exec playwright install chromium`

## 2. Workspace Configuration

- [ ] 2.1 Update `vitest.workspace.ts` to include shared test configuration
- [ ] 2.2 Add `clearMocks: true` to workspace config
- [ ] 2.3 Add `restoreMocks: true` to workspace config
- [ ] 2.4 Add `unstubEnvs: true` to workspace config
- [ ] 2.5 Add `unstubGlobals: true` to workspace config
- [ ] 2.6 Add `maxConcurrency: 10` to workspace config
- [ ] 2.7 Validate workspace config syntax: `pnpm exec vitest --version`

## 3. Package Configuration Updates

### 3.1 is-odd Package

- [ ] 3.1.1 Migrate `vitest.config.ts` from `defineConfig` to `defineProject`
- [ ] 3.1.2 Add `extends: true` to inherit workspace settings
- [ ] 3.1.3 Add `unit` project with `include: ["**/*.test.ts"]`
- [ ] 3.1.4 Add `integration` project with `include: ["**/*.integration.ts"]`
- [ ] 3.1.5 Configure unit project coverage thresholds (lines: 90, functions: 90, branches: 85, statements: 90)
- [ ] 3.1.6 Configure integration project coverage thresholds (lines: 80, functions: 80, branches: 75, statements: 80)
- [ ] 3.1.7 Update `package.json` scripts (test:unit, test:unit:watch, test:integration, test:integration:watch, test:types, test:types:watch, test:ui)
- [ ] 3.1.8 Validate config: `pnpm --filter @monolab/is-odd exec vitest run --project unit`

### 3.2 is-even Package

- [ ] 3.2.1 Migrate `vitest.config.ts` from `defineConfig` to `defineProject`
- [ ] 3.2.2 Add `extends: true` to inherit workspace settings
- [ ] 3.2.3 Add `unit` project with `include: ["**/*.test.ts"]`
- [ ] 3.2.4 Add `integration` project with `include: ["**/*.integration.ts"]`
- [ ] 3.2.5 Configure unit project coverage thresholds (lines: 90, functions: 90, branches: 85, statements: 90)
- [ ] 3.2.6 Configure integration project coverage thresholds (lines: 80, functions: 80, branches: 75, statements: 80)
- [ ] 3.2.7 Update `package.json` scripts (test:unit, test:unit:watch, test:integration, test:integration:watch, test:types, test:types:watch, test:ui)
- [ ] 3.2.8 Validate config: `pnpm --filter @monolab/is-even exec vitest run --project unit`

### 3.3 ts-configs Package

- [ ] 3.3.1 Migrate `vitest.config.ts` from `defineConfig` to `defineProject`
- [ ] 3.3.2 Add `extends: true` to inherit workspace settings
- [ ] 3.3.3 Add `unit` project with `include: ["**/*.test.ts"]`
- [ ] 3.3.4 Add `integration` project with `include: ["**/*.integration.ts"]`
- [ ] 3.3.5 Configure unit project coverage thresholds (lines: 80, functions: 80, branches: 75, statements: 80)
- [ ] 3.3.6 Configure integration project coverage thresholds (lines: 70, functions: 70, branches: 65, statements: 70)
- [ ] 3.3.7 Update `package.json` scripts (test:unit, test:unit:watch, test:integration, test:integration:watch, test:types, test:types:watch, test:ui)
- [ ] 3.3.8 Validate config: `pnpm --filter @monolab/ts-configs exec vitest run --project unit`

### 3.4 react-hooks Package

- [ ] 3.4.1 Migrate `vitest.config.ts` from `defineConfig` to `defineProject`
- [ ] 3.4.2 Add `extends: true` to inherit workspace settings
- [ ] 3.4.3 Add `unit` project with `include: ["**/*.test.ts", "**/*.test.tsx"]`, `environment: "jsdom"`
- [ ] 3.4.4 Add `integration` project with `include: ["**/*.integration.ts"]`
- [ ] 3.4.5 Add `browser` project with `include: ["**/*.browser.test.ts", "**/*.browser.test.tsx"]`
- [ ] 3.4.6 Configure browser project with Playwright provider and Chromium instance
- [ ] 3.4.7 Set browser project to headless mode
- [ ] 3.4.8 Configure unit project coverage thresholds (lines: 85, functions: 85, branches: 80, statements: 85)
- [ ] 3.4.9 Configure integration project coverage thresholds (lines: 75, functions: 75, branches: 70, statements: 75)
- [ ] 3.4.10 Configure browser project coverage with separate reports directory (`./coverage/browser`)
- [ ] 3.4.11 Update `package.json` scripts (test:unit, test:unit:watch, test:integration, test:integration:watch, test:browser, test:browser:watch, test:types, test:types:watch, test:ui)
- [ ] 3.4.12 Validate config: `pnpm --filter @monolab/react-hooks exec vitest run --project unit`

### 3.5 react-clean Package

- [ ] 3.5.1 Migrate `vitest.config.ts` from `defineConfig` to `defineProject`
- [ ] 3.5.2 Add `extends: true` to inherit workspace settings
- [ ] 3.5.3 Add `unit` project with `include: ["**/*.test.ts", "**/*.test.tsx"]`, `environment: "jsdom"`
- [ ] 3.5.4 Add `integration` project with `include: ["**/*.integration.ts"]`
- [ ] 3.5.5 Add `browser` project with `include: ["**/*.browser.test.ts", "**/*.browser.test.tsx"]`
- [ ] 3.5.6 Configure browser project with Playwright provider and Chromium instance
- [ ] 3.5.7 Set browser project to headless mode
- [ ] 3.5.8 Configure unit project coverage thresholds (lines: 85, functions: 85, branches: 80, statements: 85)
- [ ] 3.5.9 Configure integration project coverage thresholds (lines: 75, functions: 75, branches: 70, statements: 75)
- [ ] 3.5.10 Configure browser project coverage with separate reports directory (`./coverage/browser`)
- [ ] 3.5.11 Update `package.json` scripts (test:unit, test:unit:watch, test:integration, test:integration:watch, test:browser, test:browser:watch, test:types, test:types:watch, test:ui)
- [ ] 3.5.12 Validate config: `pnpm --filter @monolab/react-clean exec vitest run --project unit`

## 4. Root Package Scripts

- [ ] 4.1 Update root `package.json` with `test:unit` script: `nx run-many --target=test:unit`
- [ ] 4.2 Add `test:unit:affected` script: `nx affected --target=test:unit`
- [ ] 4.3 Add `test:unit:watch` script: `nx run-many --target=test:unit:watch`
- [ ] 4.4 Add `test:integration` script: `nx run-many --target=test:integration`
- [ ] 4.5 Add `test:integration:affected` script: `nx affected --target=test:integration`
- [ ] 4.6 Add `test:integration:watch` script: `nx run-many --target=test:integration:watch`
- [ ] 4.7 Add `test:types` script: `nx run-many --target=test:types`
- [ ] 4.8 Add `test:types:affected` script: `nx affected --target=test:types`
- [ ] 4.9 Add `test:types:watch` script: `nx run-many --target=test:types:watch`
- [ ] 4.10 Add `test:browser` script: `nx run-many --target=test:browser`
- [ ] 4.11 Add `test:browser:affected` script: `nx affected --target=test:browser`
- [ ] 4.12 Add `test:ui` script: `vitest --ui`

## 5. Type Testing Implementation

- [ ] 5.1 Create `packages/is-odd/src/index.test-d.ts` with type assertions
- [ ] 5.2 Create `packages/is-even/src/index.test-d.ts` with type assertions
- [ ] 5.3 Create `packages/react-hooks/src/hooks/use-did-mount.test-d.ts` with type assertions
- [ ] 5.4 Add typecheck configuration to each package's vitest.config.ts
- [ ] 5.5 Validate type tests run: `pnpm run test:types`

## 6. Browser Testing Implementation (React packages only)

- [ ] 6.1 Create example browser test in `packages/react-hooks/src/hooks/use-did-mount.browser.test.tsx`
- [ ] 6.2 Create example browser test in `packages/react-clean/src/base.viewmodel.browser.test.tsx`
- [ ] 6.3 Validate browser tests run: `pnpm --filter @monolab/react-hooks run test:browser`
- [ ] 6.4 Validate browser tests run: `pnpm --filter @monolab/react-clean run test:browser`

## 7. CI/CD Pipeline Updates

- [ ] 7.1 Add test:types step to CI workflow (affected and all variants)
- [ ] 7.2 Validate CI runs successfully on feature branch
- [ ] 7.3 Verify type tests execute in CI

**Note:** Vitest sharding (tasks 7.3-7.6 in original plan) is NOT implemented because Nx Cloud already distributes tasks across 3 agents. Sharding configuration is documented in design.md as alternative if Nx Cloud is removed in future.

## 8. Documentation

- [ ] 8.1 Update root README with new test command structure
- [ ] 8.2 Document test:unit vs test:integration vs test:types distinction
- [ ] 8.3 Document file naming conventions (*.test.ts, *.integration.ts, *.test-d.ts, *.browser.test.tsx)
- [ ] 8.4 Document how to run UI mode: `pnpm test:ui`
- [ ] 8.5 Document browser testing setup for React packages
- [ ] 8.6 Add examples of type tests
- [ ] 8.7 Add examples of browser tests

## 9. Validation

- [ ] 9.1 Run all unit tests: `pnpm run test:unit`
- [ ] 9.2 Run all type tests: `pnpm run test:types`
- [ ] 9.3 Run browser tests: `pnpm run test:browser`
- [ ] 9.4 Launch UI mode and verify it works: `pnpm run test:ui`
- [ ] 9.5 Verify coverage reports generate correctly for each test type
- [ ] 9.6 Verify existing tests still pass (no regressions)
- [ ] 9.7 Validate Nx affected still works: `nx affected --target=test:unit --dry-run`
- [ ] 9.8 Run full CI pipeline and verify sharding works
- [ ] 9.9 Check Codecov dashboard for merged coverage reports
- [ ] 9.10 Verify CI time reduction from sharding (compare before/after)

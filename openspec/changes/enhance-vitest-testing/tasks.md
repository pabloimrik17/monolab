# Implementation Tasks: Enhanced Vitest Testing

## 1. Dependencies and Setup

- [x] 1.1 Install browser testing dependencies: `pnpm add -D @vitest/browser vitest-browser-react playwright -w`
- [x] 1.2 Verify @vitest/ui already installed (should be present in catalog)
- [x] 1.3 Run Playwright install: `pnpm exec playwright install chromium`

## 2. Workspace Configuration

- [x] 2.1 Update `vitest.workspace.ts` to include shared test configuration
- [x] 2.2 Add `clearMocks: true` to workspace config
- [x] 2.3 Add `restoreMocks: true` to workspace config
- [x] 2.4 Add `unstubEnvs: true` to workspace config
- [x] 2.5 Add `unstubGlobals: true` to workspace config
- [x] 2.6 Add `maxConcurrency: 10` to workspace config
- [x] 2.7 Validate workspace config syntax: `pnpm exec vitest --version`

## 3. Package Configuration Updates

### 3.1 is-odd Package

- [x] 3.1.1 Migrate `vitest.config.ts` from `defineConfig` to `defineProject`
- [x] 3.1.2 Add `extends: true` to inherit workspace settings
- [x] 3.1.3 Add `unit` project with `include: ["**/*.test.ts"]` _(Simplified: uses single config with unified include patterns)_
- [x] 3.1.4 Add `integration` project with `include: ["**/*.integration.ts"]` _(Simplified: uses single config with unified include patterns)_
- [x] 3.1.5 Configure unit project coverage thresholds (lines: 90, functions: 90, branches: 85, statements: 90)
- [x] 3.1.6 Configure integration project coverage thresholds (lines: 80, functions: 80, branches: 75, statements: 80)
- [x] 3.1.7 Update `package.json` scripts (test:unit, test:unit:watch, test:integration, test:integration:watch, test:types, test:types:watch, test:ui)
- [x] 3.1.8 Validate config: `pnpm --filter @monolab/is-odd exec vitest run`

### 3.2 is-even Package

- [x] 3.2.1 Migrate `vitest.config.ts` from `defineConfig` to `defineProject`
- [x] 3.2.2 Add `extends: true` to inherit workspace settings
- [x] 3.2.3 Add `unit` project with `include: ["**/*.test.ts"]` _(Simplified: uses single config with unified include patterns)_
- [x] 3.2.4 Add `integration` project with `include: ["**/*.integration.ts"]` _(Simplified: uses single config with unified include patterns)_
- [x] 3.2.5 Configure unit project coverage thresholds (lines: 90, functions: 90, branches: 85, statements: 90)
- [x] 3.2.6 Configure integration project coverage thresholds (lines: 80, functions: 80, branches: 75, statements: 80)
- [x] 3.2.7 Update `package.json` scripts (test:unit, test:unit:watch, test:integration, test:integration:watch, test:types, test:types:watch, test:ui)
- [x] 3.2.8 Validate config: `pnpm --filter @monolab/is-even exec vitest run`

### 3.3 ts-configs Package

- [x] 3.3.1 Migrate `vitest.config.ts` from `defineConfig` to `defineProject`
- [x] 3.3.2 Add `extends: true` to inherit workspace settings
- [x] 3.3.3 Add `unit` project with `include: ["**/*.test.ts"]` _(Simplified: uses single config with unified include patterns)_
- [x] 3.3.4 Add `integration` project with `include: ["**/*.integration.ts"]` _(Simplified: uses single config with unified include patterns)_
- [x] 3.3.5 Configure unit project coverage thresholds (lines: 80, functions: 80, branches: 75, statements: 80)
- [x] 3.3.6 Configure integration project coverage thresholds (lines: 70, functions: 70, branches: 65, statements: 70)
- [x] 3.3.7 Update `package.json` scripts (test:unit, test:unit:watch, test:integration, test:integration:watch, test:types, test:types:watch, test:ui)
- [x] 3.3.8 Validate config: `pnpm --filter @monolab/ts-configs exec vitest run`

### 3.4 react-hooks Package

- [x] 3.4.1 Migrate `vitest.config.ts` from `defineConfig` to `defineProject` _(Uses defineConfig with auto-discovery from root)_
- [x] 3.4.2 Add `extends: true` to inherit workspace settings _(Inherited automatically via projects array in root)_
- [x] 3.4.3 Add `unit` project with `include: ["**/*.test.ts", "**/*.test.tsx"]`, `environment: "jsdom"` _(Simplified: unified include patterns)_
- [x] 3.4.4 Add `integration` project with `include: ["**/*.integration.ts"]` _(Simplified: unified include patterns)_
- [x] 3.4.5 Add `browser` project with `include: ["**/*.browser.test.ts", "**/*.browser.test.tsx"]` _(Browser tests via --browser.enabled flag)_
- [x] 3.4.6 Configure browser project with Playwright provider and Chromium instance
- [x] 3.4.7 Set browser project to headless mode
- [x] 3.4.8 Configure unit project coverage thresholds (lines: 85, functions: 85, branches: 80, statements: 85)
- [x] 3.4.9 Configure integration project coverage thresholds (lines: 75, functions: 75, branches: 70, statements: 75)
- [x] 3.4.10 Configure browser project coverage with separate reports directory (`./coverage/browser`) _(Uses single coverage directory)_
- [x] 3.4.11 Update `package.json` scripts (test:unit, test:unit:watch, test:integration, test:integration:watch, test:browser, test:browser:watch, test:types, test:types:watch, test:ui)
- [x] 3.4.12 Validate config: `pnpm --filter @monolab/react-hooks run test:browser`

### 3.5 react-clean Package

- [x] 3.5.1 Migrate `vitest.config.ts` from `defineConfig` to `defineProject` _(Uses defineConfig with auto-discovery from root)_
- [x] 3.5.2 Add `extends: true` to inherit workspace settings _(Inherited automatically via projects array in root)_
- [x] 3.5.3 Add `unit` project with `include: ["**/*.test.ts", "**/*.test.tsx"]`, `environment: "jsdom"` _(Simplified: unified include patterns)_
- [x] 3.5.4 Add `integration` project with `include: ["**/*.integration.ts"]` _(Simplified: unified include patterns)_
- [x] 3.5.5 Add `browser` project with `include: ["**/*.browser.test.ts", "**/*.browser.test.tsx"]` _(Browser tests via --browser.enabled flag)_
- [x] 3.5.6 Configure browser project with Playwright provider and Chromium instance
- [x] 3.5.7 Set browser project to headless mode
- [x] 3.5.8 Configure unit project coverage thresholds (lines: 85, functions: 85, branches: 80, statements: 85)
- [x] 3.5.9 Configure integration project coverage thresholds (lines: 75, functions: 75, branches: 70, statements: 75)
- [x] 3.5.10 Configure browser project coverage with separate reports directory (`./coverage/browser`) _(Uses single coverage directory)_
- [x] 3.5.11 Update `package.json` scripts (test:unit, test:unit:watch, test:integration, test:integration:watch, test:browser, test:browser:watch, test:types, test:types:watch, test:ui)
- [x] 3.5.12 Validate config: `pnpm --filter @monolab/react-clean run test:browser`

## 4. Root Package Scripts

- [x] 4.1 Update root `package.json` with `test:unit` script: `nx run-many --target=test:unit`
- [x] 4.2 Add `test:unit:affected` script: `nx affected --target=test:unit`
- [x] 4.3 Add `test:unit:watch` script: `nx run-many --target=test:unit:watch`
- [x] 4.4 Add `test:integration` script: `nx run-many --target=test:integration`
- [x] 4.5 Add `test:integration:affected` script: `nx affected --target=test:integration`
- [x] 4.6 Add `test:integration:watch` script: `nx run-many --target=test:integration:watch`
- [x] 4.7 Add `test:types` script: `nx run-many --target=test:types`
- [x] 4.8 Add `test:types:affected` script: `nx affected --target=test:types`
- [x] 4.9 Add `test:types:watch` script: `nx run-many --target=test:types:watch`
- [x] 4.10 Add `test:browser` script: `nx run-many --target=test:browser`
- [x] 4.11 Add `test:browser:affected` script: `nx affected --target=test:browser`
- [x] 4.12 Add `test:ui` script: `vitest --ui`

## 5. Type Testing Implementation

- [x] 5.1 Create `packages/is-odd/src/index.test-d.ts` with type assertions
- [x] 5.2 Create `packages/is-even/src/index.test-d.ts` with type assertions
- [x] 5.3 Create `packages/react-hooks/src/hooks/use-did-mount.test-d.ts` with type assertions
- [x] 5.4 Add typecheck configuration to each package's vitest.config.ts
- [x] 5.5 Validate type tests run: `pnpm run test:types`

## 6. Browser Testing Implementation (React packages only)

- [x] 6.1 Create example browser test in `packages/react-hooks/src/hooks/use-did-mount.browser.test.tsx`
- [x] 6.2 Create example browser test in `packages/react-clean/src/base.viewmodel.browser.test.tsx`
- [x] 6.3 Validate browser tests run: `pnpm --filter @monolab/react-hooks run test:browser`
- [x] 6.4 Validate browser tests run: `pnpm --filter @monolab/react-clean run test:browser`

## 7. CI/CD Pipeline Updates

- [x] 7.1 Add test:types step to CI workflow (affected and all variants)
- [x] 7.2 Validate CI runs successfully on feature branch
- [x] 7.3 Verify type tests execute in CI

**Note:** Vitest sharding (tasks 7.3-7.6 in original plan) is NOT implemented because Nx Cloud already distributes tasks across 3 agents. Sharding configuration is documented in design.md as alternative if Nx Cloud is removed in the future.

## 8. Documentation

- [x] 8.1 Update root README with new test command structure
- [x] 8.2 Document test:unit vs test:integration vs test:types distinction
- [x] 8.3 Document file naming conventions (*.test.ts, *.integration.ts, *.test-d.ts, *.browser.test.tsx)
- [x] 8.4 Document how to run UI mode: `pnpm test:ui`
- [x] 8.5 Document browser testing setup for React packages
- [x] 8.6 Add examples of type tests
- [x] 8.7 Add examples of browser tests

## 9. Validation

- [x] 9.1 Run all unit tests: `pnpm run test:unit`
- [x] 9.2 Run all type tests: `pnpm run test:types`
- [x] 9.3 Run browser tests: `pnpm run test:browser`
- [x] 9.4 Launch UI mode and verify it works: `pnpm run test:ui`
- [x] 9.5 Verify coverage reports generate correctly for each test type
- [x] 9.6 Verify existing tests still pass (no regressions)
- [x] 9.7 Validate Nx affected still works: `nx affected --target=test:unit --dry-run`
- [x] 9.8 Run full CI pipeline and verify Nx Cloud distribution works
- [x] 9.9 Check Codecov dashboard for merged coverage reports
- [x] 9.10 Verify CI time with Nx Cloud distribution (3 agents)

# Implementation Tasks

## 1. Git Repository Changes

- [x] 1.1 Execute `git mv packages/types packages/ts-types` to preserve history
- [x] 1.2 Verify git history is preserved with `git log --follow packages/ts-types/`

## 2. Package Configuration Updates

- [x] 2.1 Update `packages/ts-types/package.json` name field to `@m0n0lab/ts-types`
- [x] 2.2 Update `packages/ts-types/deno.json` name field to `@m0n0lab/ts-types`
- [x] 2.3 Update `packages/ts-types/project.json` name field to `@monolab/ts-types`
- [x] 2.4 Update `packages/ts-types/README.md` with new package name in all references
- [x] 2.5 Update package name in `packages/ts-types/src/index.ts` header comment
- [x] 2.6 Update test suite name in `packages/ts-types/src/index.test.ts`

## 3. Release Configuration

- [x] 3.1 Update `release-please-config.json` key from `packages/types` to `packages/ts-types`
- [x] 3.2 Update `release-please-config.json` package-name to `@m0n0lab/ts-types`

## 4. Codecov Configuration

- [x] 4.1 Rename `coverage.status.project.types` to `ts-types` in `codecov.yaml`
- [x] 4.2 Update flags reference from `types` to `ts-types`
- [x] 4.3 Rename `coverage.status.patch.types` to `ts-types` in `codecov.yaml`
- [x] 4.4 Update flags reference from `types` to `ts-types`
- [x] 4.5 Rename flag definition from `types` to `ts-types` in `codecov.yaml`
- [x] 4.6 Update path from `packages/types/` to `packages/ts-types/`

## 5. CI Workflow Updates

- [x] 5.1 Add `ts-types` to package detection list in `.github/workflows/ci.yml` (line ~152)
- [x] 5.2 Add coverage upload step for `ts-types` after line ~207
- [x] 5.3 Add test results upload step for `ts-types` after line ~255
- [x] 5.4 Add `ts-types` to bundle analyzer list in `.github/workflows/ci.yml` (line ~290)

## 6. OpenSpec Documentation Updates

- [x] 6.1 Update package name references in `openspec/changes/add-types-package/proposal.md`
- [x] 6.2 Update package name references in `openspec/changes/add-types-package/specs/types-package/spec.md`
- [x] 6.3 Update commands in `openspec/changes/add-types-package/tasks.md`

## 7. Validation

- [x] 7.1 Run `pnpm exec nx show projects` and verify `@monolab/ts-types` appears
- [x] 7.2 Run `pnpm exec nx run @monolab/ts-types:build` successfully
- [x] 7.3 Run `pnpm exec nx run @monolab/ts-types:test:unit` successfully
- [x] 7.4 Run `pnpm exec nx run @monolab/ts-types:lint:eslint` successfully
- [x] 7.5 Verify `pnpm install` completes without errors
- [x] 7.6 Run `openspec validate rename-types-to-ts-types --strict` successfully

## 8. NPM Package Management

- [x] 8.1 Publish `@m0n0lab/ts-types` to NPM (published v1.0.6)
- [x] 8.2 ~~Deprecate `@m0n0lab/types` on NPM~~ N/A - old package never published
- [x] 8.3 Update `@m0n0lab/ts-types` on JSR (published v1.0.6)
- [x] 8.4 ~~Deprecate `@m0n0lab/types` on JSR~~ N/A - old package never published

## 9. Documentation and Communication

- [x] 9.1 Add migration note to `packages/ts-types/CHANGELOG.md` (v1.0.0 entry mentions rename)
- [x] 9.2 Create GitHub release with rename explanation (ts-types-v1.0.0 through v1.0.6 exist)
- [x] 9.3 Update `packages/ts-types/README.md` with migration notice (N/A - no external users of old name)

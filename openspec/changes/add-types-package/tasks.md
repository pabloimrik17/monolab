# Implementation Tasks

## 1. Package Structure Setup

- [x] 1.1 Create `packages/ts-types/` directory
- [x] 1.2 Create `packages/ts-types/src/` source directory
- [x] 1.3 Create `packages/ts-types/src/index.ts` entry point
- [x] 1.4 Create minimal Nx `project.json` without plugins

## 2. Package Configuration

- [x] 2.1 Create `package.json` with name `@monolab/ts-types`
- [x] 2.2 Set version to `0.1.0` (initial)
- [x] 2.3 Configure `type: "module"` for ESM
- [x] 2.4 Setup `exports` field pointing to `./dist/index.js` and types
- [x] 2.5 Add `files` array including dist, README, CHANGELOG, LICENSE
- [x] 2.6 Configure `engines` for Node 24.11.0 and pnpm 10.19.0
- [x] 2.7 Add `publishConfig` for public access
- [x] 2.8 Set `sideEffects: false` for tree-shaking

## 3. JSR Publishing Configuration

- [x] 3.1 Create `jsr.json` with name `@monolab/ts-types`
- [x] 3.2 Set version to `0.1.0` (matching package.json)
- [x] 3.3 Set `license: "MIT"`
- [x] 3.4 Configure `exports` field pointing to `./src/index.ts` (source file for JSR)
- [x] 3.5 Add `imports` field if package has JSR dependencies (leave empty initially)

## 4. TypeScript Configuration

- [x] 4.1 Create `tsconfig.json` extending `../ts-configs/tsconfig.node.lib.json`
- [x] 4.2 Set `outDir: "./dist"` and `rootDir: "./src"`
- [x] 4.3 Configure `include: ["src/**/*"]`
- [x] 4.4 Ensure composite build support with declaration maps

## 5. Build Scripts

- [x] 5.1 Add `build` script: `tsc -b` (composite build)
- [x] 5.2 Add `typecheck` script: `tsc --noEmit`
- [x] 5.3 Add standard lint scripts (eslint, knip)
- [x] 5.4 Add standard test scripts (vitest)

## 6. Documentation

- [x] 6.1 Create `README.md` with package description
- [x] 6.2 Document installation and usage examples
- [x] 6.3 Add contributing guidelines reference
- [x] 6.4 Create placeholder `CHANGELOG.md`

## 7. Supporting Files

- [x] 7.1 Create `.prettierignore` (ignore dist/)
- [x] 7.2 Create `vitest.config.ts` for testing setup
- [x] 7.3 Add `.eslintcache` to `.gitignore` if needed

## 8. Validation

- [x] 8.1 Run `pnpm install` to update workspace
- [x] 8.2 Run `pnpm --filter @monolab/ts-types build` to verify compilation
- [x] 8.3 Verify `dist/` output contains `.js` and `.d.ts` files
- [x] 8.4 Run `pnpm --filter @monolab/ts-types typecheck` successfully
- [x] 8.5 Verify package appears in `pnpm list` output

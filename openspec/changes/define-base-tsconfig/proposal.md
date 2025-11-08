# Define Base TypeScript Configuration

## Why

The monorepo needs a foundational TypeScript configuration that enforces maximum type safety, optimizes build performance, and provides a platform-agnostic base for all derived configurations (web/node, lib/app). Currently, `packages/ts-configs/tsconfig.base.json` exists but lacks comprehensive strictness flags, performance optimizations, and clear separation between base and platform-specific settings.

## What Changes

- Update `packages/ts-configs/tsconfig.base.json` with maximum strictness (15+ compiler options)
- Add performance optimizations (`incremental`, `composite`) for monorepo builds
- Remove platform-specific settings (`module`, `moduleResolution`) to make truly agnostic
- Change `target` from ES2023 to ES2022 for better runtime compatibility
- Add missing strict flags: `noImplicitOverride`, `noImplicitReturns`, `allowUnreachableCode: false`, `allowUnusedLabels: false`
- Add interop settings: `allowJs`, `resolveJsonModule`, `forceConsistentCasingInFileNames`
- Maintain `lib: ["ES2024"]` for modern API types while compiling to ES2022

## Impact

**Affected specs:**
- `typescript-configuration` (NEW) - Defines requirements for base tsconfig structure and options

**Affected code:**
- `packages/ts-configs/tsconfig.base.json` - Complete restructure with 4 logical groups
- Future: `tsconfig.web-base.json`, `tsconfig.node-base.json` will extend this base (out of scope)

**Breaking changes:**
- **BREAKING**: Projects extending base config must migrate to platform-specific configs (web-base/node-base) once created
- **BREAKING**: New strict flags (`noImplicitReturns`, `noImplicitOverride`, etc.) will cause compilation errors in existing code
- **BREAKING**: Removed `module` and `moduleResolution` from base requires platform configs to provide them

**Migration path:**
- Projects can temporarily override strict flags to `false` while fixing issues
- Base config can be used standalone during transition period before platform configs exist

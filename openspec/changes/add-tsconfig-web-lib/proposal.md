# Add TypeScript Web Library Configuration

## Why
Web libraries (like React components) in the monorepo need a specialized TypeScript configuration that extends the web base config with library-specific settings for type declarations and bundler-friendly output.

## What Changes
- Add `tsconfig.web.lib.json` in the `packages/ts-configs/` directory
- Extend from `./tsconfig.web.base.json`
- Configure compiler options specific to web libraries (declaration files required, optimized for publishing)
- Enable composite builds and declaration maps for TypeScript project references
- Update `package.json` exports and files to include the new config

## Impact
- Affected specs: typescript-config (MODIFIED)
- Affected code:
  - `packages/ts-configs/tsconfig.web.lib.json` (new file)
  - `packages/ts-configs/package.json` (updated exports and files)
  - `packages/ts-configs/README.md` (updated documentation)
- Depends on: MON-117 (tsconfig.web.base.json must exist first)

## Linear Issue
- Issue ID: MON-31
- Issue URL: https://linear.app/monolab/issue/MON-31/tsconfig-web-lib
- Branch Name: feature/mon-31-tsconfig-web-lib

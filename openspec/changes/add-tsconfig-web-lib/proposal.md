# Add TypeScript Web Library Configuration

## Why
Web libraries (like React components) in the monorepo need a specialized TypeScript configuration that extends the web base config with library-specific settings for type declarations and bundler-friendly output.

## What Changes
- Add `tsconfig.web.lib.json` in the root directory
- Extend from `tsconfig.web.base.json`
- Configure compiler options specific to web libraries (declaration files required, optimized for publishing)
- Enable composite builds and declaration maps for TypeScript project references

## Impact
- Affected specs: typescript-config (MODIFIED)
- Affected code: Root `tsconfig.web.lib.json` (new file)
- Depends on: MON-117 (tsconfig.web.base.json must exist first)

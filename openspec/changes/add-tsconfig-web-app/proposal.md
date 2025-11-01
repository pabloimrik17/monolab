# Add TypeScript Web Application Configuration

## Why
Web applications in the monorepo need a specialized TypeScript configuration that extends the web base config with application-specific settings optimized for bundled, executable web apps.

## What Changes
- Add `tsconfig.web.app.json` in the root directory
- Extend from `tsconfig.web.base.json`
- Configure compiler options specific to web applications (no declaration files needed, optimized for bundling)
- Set up output and bundling settings appropriate for applications

## Impact
- Affected specs: typescript-config (MODIFIED)
- Affected code: Root `tsconfig.web.app.json` (new file)
- Depends on: MON-117 (tsconfig.web.base.json must exist first)

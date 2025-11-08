# Add TypeScript Web Base Configuration

## Why
The monorepo needs a shared base TypeScript configuration for web/browser environments to ensure consistent compiler settings across all web-based projects (applications and libraries).

## What Changes
- Add `tsconfig.web.base.json` in the root directory
- Configure compiler options optimized for browser environments (DOM types, modern ES targets)
- Enable this configuration to be extended by web applications and libraries
- Set up proper module resolution and JSX support for React projects

## Impact
- Affected specs: typescript-config (NEW)
- Affected code: Root `tsconfig.web.base.json` (new file)
- This becomes the foundation for MON-29 (web apps) and MON-31 (web libs)

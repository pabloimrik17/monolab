# Proposal: fix-qup-web-wiring

## Why

Static analysis (fallow evaluation, MON-204) uncovered two production wiring bugs in `apps/qup-web`, both confirmed against the compiled `.output` bundle:

1. `src/middleware.ts` (admin auth guard) is never registered — `app.config.ts` lacks the `middleware` option, so `/admin/*` routes are unprotected.
2. `src/global.css` (Tailwind entry, `@import "tailwindcss"`) is imported by nothing — pages ship unstyled despite routes using Tailwind classes.

## What Changes

- Register the middleware: add `middleware: "./src/middleware.ts"` to `defineConfig()` in `apps/qup-web/app.config.ts`.
- Load global styles: add `import "./global.css";` in `apps/qup-web/src/app.tsx`.
- Verify both against the built bundle (guard code present in `.output`, CSS emitted).

## Capabilities

### New Capabilities

- `qup-web-app-shell`: SolidStart app-shell wiring for qup-web — middleware registration (admin route protection) and global stylesheet delivery.

### Modified Capabilities

(none)

## Impact

- Files: `apps/qup-web/app.config.ts`, `apps/qup-web/src/app.tsx`.
- Behavior: `/admin/*` becomes auth-gated (intended, previously broken); Tailwind styles apply on every qup-web page (visual change).
- No API/dependency changes.
